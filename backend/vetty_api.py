import os
import base64
import hmac
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from datetime import timedelta
from flask import Flask, jsonify, request
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from sqlalchemy import inspect, text
from datetime import datetime
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
from auth import admin_required, current_user, error
from database import db
from models import Booking, DeliveryZone, Order, Payment, Product, Service, User

load_dotenv()
app = Flask(__name__)
# Vercel's deployed bundle is read-only. Its temporary directory is writable
# for the lifetime of a serverless instance, which keeps the local-development
# SQLite fallback from preventing the API from starting when no database URL is
# configured. Production data still belongs in DATABASE_URL (PostgreSQL).
runtime_dir = '/tmp/vetty' if os.getenv('VERCEL') else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance')
os.makedirs(runtime_dir, exist_ok=True)

# Configurations
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'vetty-super-secret-key')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-super-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
# An absolute path makes the local database location predictable even when the
# app is started from the repository root rather than the backend directory.
database_url = os.environ.get('DATABASE_URL', f"sqlite:///{os.path.join(runtime_dir, 'vetty.db')}")
# Flask-SQLAlchemy resolves relative SQLite URLs from Flask's instance path,
# which differs when this module is imported as ``vetty_api`` vs
# ``backend.vetty_api``. Resolve them beside this file so both launch commands
# always use the same local database.
if database_url.startswith('sqlite:///') and not database_url.startswith('sqlite:////'):
    database_url = f"sqlite:///{os.path.join(runtime_dir, database_url[len('sqlite:///'):])}"
app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
jwt = JWTManager(app)
allowed_origins = [origin.strip() for origin in os.getenv('CORS_ORIGINS', '').split(',') if origin.strip()]
CORS(app, resources={r'/api/*': {'origins': allowed_origins or '*'}})

@app.route('/', methods=['GET'])
@app.route('/api', methods=['GET'])
@app.route('/api/', methods=['GET'])
def api_index():
    """Make the backend URL useful when opened directly in a browser."""
    return jsonify({
        'service': 'Vetty API',
        'status': 'ok',
        'health': '/api/health',
        'authentication': '/api/auth/login',
    }), 200


@app.route('/api/health', methods=['GET'])
def health():
    """Lightweight endpoint for deployment and frontend connectivity checks."""
    return jsonify({'status': 'ok'}), 200


@app.errorhandler(404)
def api_not_found(_error):
    if request.path.startswith('/api'):
        return jsonify({'error': 'API endpoint not found', 'path': request.path}), 404
    return jsonify({'error': 'Not found'}), 404


@app.errorhandler(405)
def method_not_allowed(_error):
    return jsonify({'error': 'Method not allowed'}), 405


def upgrade_local_schema():
    """Apply the one-time additive upgrade from the original demo user table.

    The project previously created a ``users`` table with only ``id`` and
    ``username``. SQLite cannot add the authentication columns through
    ``create_all``, so an existing local demo database needs these safe,
    additive statements before password login can work. Production databases
    should be migrated through the deployment's normal migration process.
    """
    if db.engine.dialect.name != 'sqlite':
        return
    columns = {column['name'] for column in inspect(db.engine).get_columns('users')}
    upgrades = []
    if 'email' not in columns:
        upgrades.append('ALTER TABLE users ADD COLUMN email VARCHAR(120)')
    if 'password_hash' not in columns:
        upgrades.append('ALTER TABLE users ADD COLUMN password_hash VARCHAR(255)')
    if 'role' not in columns:
        upgrades.append("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'customer'")
    for statement in upgrades:
        db.session.execute(text(statement))
    if 'email' not in columns:
        db.session.execute(text('CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email)'))
    if upgrades:
        db.session.commit()


def initialize_local_database():
    """Make a fresh or legacy local SQLite install usable on first request."""
    if db.engine.dialect.name != 'sqlite':
        return
    db.create_all()
    upgrade_local_schema()


with app.app_context():
    initialize_local_database()


def required_settings(*names):
    missing = [name for name in names if not os.getenv(name) or os.getenv(name, '').startswith('replace_')]
    if missing:
        raise RuntimeError('Payment provider is not configured: ' + ', '.join(missing))


def order_for_current_user(order_id):
    order = db.session.get(Order, order_id)
    if not order:
        return None, error('Order not found', 404)
    if order.user_id != int(get_jwt_identity()):
        return None, error('Access denied', 403)
    return order, None


def amount_in_cents(amount):
    try:
        result = (Decimal(str(amount)) * 100).quantize(Decimal('1'), rounding=ROUND_HALF_UP)
    except (InvalidOperation, ValueError):
        raise ValueError('Order amount is invalid')
    if result <= 0:
        raise ValueError('Order amount must be greater than zero')
    return int(result)


def normalize_kenyan_phone(phone):
    digits = ''.join(character for character in str(phone or '') if character.isdigit())
    if digits.startswith('0'): digits = '254' + digits[1:]
    if digits.startswith('7') and len(digits) == 9: digits = '254' + digits
    if len(digits) != 12 or not digits.startswith('2547'):
        raise ValueError('Use a valid Kenyan M-Pesa number, for example 254712345678')
    return digits


def mpesa_base_url():
    """Return the Daraja API host for the selected environment."""
    environment = os.getenv('MPESA_ENV', 'sandbox').lower()
    if environment == 'sandbox':
        return 'https://sandbox.safaricom.co.ke'
    if environment == 'production':
        return 'https://api.safaricom.co.ke'
    raise ValueError('MPESA_ENV must be either "sandbox" or "production"')


def mpesa_access_token(requests, base_url):
    response = requests.get(
        f'{base_url}/oauth/v1/generate?grant_type=client_credentials',
        auth=(os.environ['MPESA_CONSUMER_KEY'], os.environ['MPESA_CONSUMER_SECRET']), timeout=20
    )
    response.raise_for_status()
    token = response.json().get('access_token')
    if not token:
        raise ValueError('M-Pesa did not return an access token')
    return token


@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.get_json(silent=True) or {}
    username = str(data.get('username') or '').strip()
    email = str(data.get('email') or '').strip().lower()
    password = str(data.get('password') or '')
    if len(username) < 2 or '@' not in email or len(password) < 8:
        return error('Username, a valid email, and an 8-character password are required')
    if User.query.filter((User.username == username) | (User.email == email)).first():
        return error('An account with that username or email already exists', 409)
    user = User(username=username, email=email, password_hash=generate_password_hash(password), role='customer')
    db.session.add(user); db.session.commit()
    return jsonify({'user': user.to_dict(), 'access_token': create_access_token(identity=str(user.id)), 'token_type': 'bearer'}), 201


@app.route('/api/auth/login', methods=['POST'])
def password_login():
    data = request.get_json(silent=True) or {}
    identifier = str(data.get('email') or data.get('username') or '').strip()
    password = str(data.get('password') or '')
    user = User.query.filter((User.email == identifier.lower()) | (User.username == identifier)).first()
    if not user or not user.password_hash or not check_password_hash(user.password_hash, password):
        return error('Invalid email or password', 401)
    return jsonify({'user': user.to_dict(), 'access_token': create_access_token(identity=str(user.id)), 'token_type': 'bearer'}), 200


@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def me():
    user = current_user()
    return jsonify({'user': user.to_dict()})


def apply_fields(model, data, fields):
    for name in fields:
        if name in data:
            setattr(model, name, data[name])


def catalog_response(model):
    return jsonify([item.to_dict() for item in model.query.order_by(model.id.desc()).all()])


@app.route('/api/products', methods=['GET', 'POST'])
@jwt_required(optional=True)
def products():
    if request.method == 'GET': return catalog_response(Product)
    auth_error = admin_required()
    if auth_error: return auth_error
    data = request.get_json(silent=True) or {}
    required = ('name', 'price', 'category')
    if not all(str(data.get(field, '')).strip() for field in required): return error('name, price, and category are required')
    product = Product(name=data['name'].strip(), price=data['price'], category=data['category'].strip(), description=str(data.get('desc', '')), stock=int(data.get('stock', 0)), threshold=int(data.get('threshold', 10)), icon=str(data.get('icon', 'Package')))
    db.session.add(product); db.session.commit()
    return jsonify(product.to_dict()), 201


@app.route('/api/products/<int:product_id>', methods=['GET', 'PATCH', 'DELETE'])
@jwt_required(optional=True)
def product_detail(product_id):
    product = db.session.get(Product, product_id)
    if not product: return error('Product not found', 404)
    if request.method == 'GET': return jsonify(product.to_dict())
    auth_error = admin_required()
    if auth_error: return auth_error
    if request.method == 'DELETE': db.session.delete(product); db.session.commit(); return '', 204
    apply_fields(product, request.get_json(silent=True) or {}, ('name', 'price', 'category', 'description', 'stock', 'threshold', 'icon'))
    db.session.commit(); return jsonify(product.to_dict())


@app.route('/api/services', methods=['GET', 'POST'])
@jwt_required(optional=True)
def services():
    if request.method == 'GET': return catalog_response(Service)
    auth_error = admin_required()
    if auth_error: return auth_error
    data = request.get_json(silent=True) or {}
    if not all(data.get(field) for field in ('name', 'price', 'duration')): return error('name, price, and duration are required')
    service = Service(name=data['name'], price=data['price'], duration=data['duration'], description=data.get('desc', ''), icon=data.get('icon', 'Stethoscope'))
    db.session.add(service); db.session.commit(); return jsonify(service.to_dict()), 201


@app.route('/api/services/<int:service_id>', methods=['GET', 'PATCH', 'DELETE'])
@jwt_required(optional=True)
def service_detail(service_id):
    service = db.session.get(Service, service_id)
    if not service: return error('Service not found', 404)
    if request.method == 'GET': return jsonify(service.to_dict())
    auth_error = admin_required()
    if auth_error: return auth_error
    if request.method == 'DELETE': db.session.delete(service); db.session.commit(); return '', 204
    apply_fields(service, request.get_json(silent=True) or {}, ('name', 'price', 'duration', 'description', 'icon'))
    db.session.commit(); return jsonify(service.to_dict())


@app.route('/api/zones', methods=['GET', 'POST'])
@jwt_required(optional=True)
def zones():
    if request.method == 'GET': return catalog_response(DeliveryZone)
    auth_error = admin_required()
    if auth_error: return auth_error
    data = request.get_json(silent=True) or {}
    if not data.get('name') or not data.get('eta'): return error('name and eta are required')
    zone = DeliveryZone(name=data['name'], fee=data.get('fee', 0), eta=data['eta'])
    db.session.add(zone); db.session.commit(); return jsonify(zone.to_dict()), 201


@app.route('/api/zones/<int:zone_id>', methods=['PATCH', 'DELETE'])
@jwt_required()
def zone_detail(zone_id):
    auth_error = admin_required()
    if auth_error: return auth_error
    zone = db.session.get(DeliveryZone, zone_id)
    if not zone: return error('Delivery zone not found', 404)
    if request.method == 'DELETE': db.session.delete(zone); db.session.commit(); return '', 204
    apply_fields(zone, request.get_json(silent=True) or {}, ('name', 'fee', 'eta')); db.session.commit(); return jsonify(zone.to_dict())


@app.route('/api/bookings', methods=['GET', 'POST'])
@jwt_required()
def bookings():
    user = current_user()
    if request.method == 'GET':
        query = Booking.query
        if user.role != 'admin': query = query.filter_by(user_id=user.id)
        return jsonify([booking.to_dict() for booking in query.order_by(Booking.created_at.desc()).all()])
    data = request.get_json(silent=True) or {}
    service = db.session.get(Service, data.get('service_id'))
    if not service or not data.get('pet_name') or not data.get('appointment_at'):
        return error('service_id, pet_name, and appointment_at are required')
    booking = Booking(user_id=user.id, service_id=service.id, pet_name=data['pet_name'], appointment_at=data['appointment_at'], notes=data.get('notes', ''))
    db.session.add(booking); db.session.commit(); return jsonify(booking.to_dict()), 201


@app.route('/api/bookings/<int:booking_id>', methods=['PATCH', 'DELETE'])
@jwt_required()
def booking_detail(booking_id):
    booking = db.session.get(Booking, booking_id)
    if not booking: return error('Booking not found', 404)
    user = current_user()
    if user.role != 'admin' and booking.user_id != user.id: return error('Access denied', 403)
    if request.method == 'DELETE': db.session.delete(booking); db.session.commit(); return '', 204
    data = request.get_json(silent=True) or {}
    allowed = ('status',) if user.role == 'admin' else ('pet_name', 'appointment_at', 'notes')
    apply_fields(booking, data, allowed); db.session.commit(); return jsonify(booking.to_dict())

# Orders --------------------------------------------------------------------
@app.route('/api/orders', methods=['POST'])
@jwt_required()
def create_order():
    current_user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    total_amount = data.get('total_amount')
    if not total_amount:
        return jsonify({'msg': 'total_amount is required'}), 400

    new_order = Order(
        user_id=int(current_user_id),
        total_amount=float(total_amount),
        status='pending'
    )
    
    db.session.add(new_order)
    db.session.commit()
    
    return jsonify({
        'id': new_order.id,
        'user_id': new_order.user_id,
        'total_amount': new_order.total_amount,
        'status': new_order.status,
        'created_at': new_order.created_at.strftime("%a, %d %b %Y %H:%M:%S GMT")
    }), 201

@app.route('/api/orders', methods=['GET'])
@jwt_required()
def get_user_orders():
    current_user_id = get_jwt_identity()
    orders = Order.query.filter_by(user_id=int(current_user_id)).order_by(Order.created_at.desc()).all()
    
    return jsonify([{
        'id': o.id,
        'user_id': o.user_id,
        'total_amount': o.total_amount,
        'status': o.status,
        'created_at': o.created_at.strftime("%a, %d %b %Y %H:%M:%S GMT")
    } for o in orders]), 200


# Payment providers ---------------------------------------------------------
# The client supplies only an order id. Amounts always come from our database.

@app.route('/api/payments/stripe/intents', methods=['POST'])
@jwt_required()
def create_stripe_payment_intent():
    try:
        required_settings('STRIPE_SECRET_KEY')
        import stripe
        payload = request.get_json(silent=True) or {}
        order, response = order_for_current_user(payload.get('order_id'))
        if response: return response

        existing = Payment.query.filter_by(order_id=order.id, provider='stripe', status='initiated').first()
        if existing:
            return error('A Stripe payment is already pending for this order', 409)

        stripe.api_key = os.environ['STRIPE_SECRET_KEY']
        intent = stripe.PaymentIntent.create(
            amount=amount_in_cents(order.total_amount),
            currency=os.getenv('STRIPE_CURRENCY', 'kes').lower(),
            automatic_payment_methods={'enabled': True},
            metadata={'order_id': str(order.id), 'user_id': str(order.user_id)},
            description=f'Vetty order #{order.id}',
            idempotency_key=f'vetty-order-{order.id}-stripe'
        )
        payment = Payment(
            order_id=order.id, provider='stripe', provider_reference=intent.id,
            amount=Decimal(str(order.total_amount)), status='initiated',
            provider_response={'status': intent.status}
        )
        db.session.add(payment); db.session.commit()
        return jsonify({
            'payment': payment.to_dict(),
            'client_secret': intent.client_secret,
            'publishable_key': os.getenv('STRIPE_PUBLISHABLE_KEY', '')
        }), 201
    except RuntimeError as exc:
        return error(str(exc), 503)
    except ValueError as exc:
        return error(str(exc))
    except Exception:
        app.logger.exception('Unable to create Stripe PaymentIntent')
        return error('Unable to start Stripe payment', 502)


@app.route('/api/payments/stripe/webhook', methods=['POST'])
def stripe_webhook():
    try:
        required_settings('STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET')
        import stripe
        signature = request.headers.get('Stripe-Signature')
        event = stripe.Webhook.construct_event(request.get_data(), signature, os.environ['STRIPE_WEBHOOK_SECRET'])
    except RuntimeError as exc:
        return error(str(exc), 503)
    except Exception:
        return error('Invalid Stripe webhook signature', 400)

    intent = event['data']['object']
    payment = Payment.query.filter_by(provider='stripe', provider_reference=intent['id']).first()
    if not payment:
        return jsonify({'received': True}), 200
    if event['type'] == 'payment_intent.succeeded':
        payment.status = 'paid'; payment.order.status = 'paid'
    elif event['type'] in {'payment_intent.payment_failed', 'payment_intent.canceled'}:
        payment.status = 'failed'
    else:
        return jsonify({'received': True}), 200
    payment.provider_response = {'status': intent.get('status'), 'event': event['type']}
    db.session.commit()
    return jsonify({'received': True}), 200


@app.route('/api/payments/mpesa/stk-push', methods=['POST'])
@jwt_required()
def initiate_mpesa_stk_push():
    try:
        import requests
        required_settings('MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_SHORTCODE', 'MPESA_PASSKEY', 'MPESA_CALLBACK_URL', 'MPESA_CALLBACK_TOKEN')
        payload = request.get_json(silent=True) or {}
        order, response = order_for_current_user(payload.get('order_id'))
        if response: return response
        phone = normalize_kenyan_phone(payload.get('phone'))
        if Payment.query.filter_by(order_id=order.id, provider='mpesa', status='initiated').first():
            return error('An M-Pesa request is already pending for this order', 409)

        base_url = mpesa_base_url()
        access_token = mpesa_access_token(requests, base_url)
        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
        shortcode = os.environ['MPESA_SHORTCODE']
        password = base64.b64encode(f"{shortcode}{os.environ['MPESA_PASSKEY']}{timestamp}".encode()).decode()
        amount = int(Decimal(str(order.total_amount)).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
        if amount < 1: return error('Order amount must be at least KES 1')
        stk_response = requests.post(
            f'{base_url}/mpesa/stkpush/v1/processrequest',
            headers={'Authorization': f'Bearer {access_token}'},
            json={
                'BusinessShortCode': shortcode, 'Password': password, 'Timestamp': timestamp,
                'TransactionType': 'CustomerPayBillOnline', 'Amount': amount,
                'PartyA': phone, 'PartyB': shortcode, 'PhoneNumber': phone,
                'CallBackURL': os.environ['MPESA_CALLBACK_URL'],
                'AccountReference': f'VETTY-{order.id}', 'TransactionDesc': f'Vetty order {order.id}'
            }, timeout=30
        )
        stk_response.raise_for_status()
        provider_data = stk_response.json()
        if str(provider_data.get('ResponseCode')) != '0' or not provider_data.get('CheckoutRequestID'):
            return error(provider_data.get('ResponseDescription', 'M-Pesa could not start the payment'), 502)
        payment = Payment(
            order_id=order.id, provider='mpesa', provider_reference=provider_data['CheckoutRequestID'],
            amount=Decimal(str(order.total_amount)), phone=phone, status='initiated', provider_response=provider_data
        )
        db.session.add(payment); db.session.commit()
        return jsonify({'payment': payment.to_dict(), 'merchant_request_id': provider_data.get('MerchantRequestID'), 'customer_message': provider_data.get('CustomerMessage')}), 201
    except RuntimeError as exc:
        return error(str(exc), 503)
    except ValueError as exc:
        return error(str(exc))
    except Exception:
        app.logger.exception('Unable to initiate M-Pesa STK Push')
        return error('Unable to initiate M-Pesa STK Push', 502)


@app.route('/api/payments/mpesa/query', methods=['POST'])
@jwt_required()
def query_mpesa_stk_push():
    """Check an existing STK Push by its saved CheckoutRequestID."""
    try:
        import requests
        required_settings('MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_SHORTCODE', 'MPESA_PASSKEY')
        payload = request.get_json(silent=True) or {}
        payment = db.session.get(Payment, payload.get('payment_id'))
        if not payment or payment.provider != 'mpesa': return error('M-Pesa payment not found', 404)
        if payment.order.user_id != int(get_jwt_identity()): return error('Access denied', 403)

        base_url = mpesa_base_url()
        access_token = mpesa_access_token(requests, base_url)
        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
        shortcode = os.environ['MPESA_SHORTCODE']
        password = base64.b64encode(f"{shortcode}{os.environ['MPESA_PASSKEY']}{timestamp}".encode()).decode()
        query_url = os.getenv('MPESA_QUERY_URL', f'{base_url}/mpesa/stkpushquery/v1/query')
        response = requests.post(
            query_url, headers={'Authorization': f"Bearer {access_token}"},
            json={'BusinessShortCode': shortcode, 'Password': password, 'Timestamp': timestamp, 'CheckoutRequestID': payment.provider_reference},
            timeout=30
        )
        response.raise_for_status()
        provider_data = response.json()
        payment.provider_response = provider_data
        # The callback remains the payment source of truth, but a completed query
        # can update status if the callback is delayed.
        if provider_data.get('ResultCode') == '0' or provider_data.get('ResultCode') == 0:
            payment.status = 'paid'; payment.order.status = 'paid'
        elif 'ResultCode' in provider_data and provider_data.get('ResultCode') not in ('1037', 1037):
            payment.status = 'failed'
        db.session.commit()
        return jsonify({'payment': payment.to_dict(), 'provider_result': provider_data}), 200
    except RuntimeError as exc:
        return error(str(exc), 503)
    except Exception:
        app.logger.exception('Unable to query M-Pesa STK Push')
        return error('Unable to query M-Pesa STK Push', 502)


@app.route('/api/payments/mpesa/callback', methods=['POST'])
def mpesa_callback():
    configured_token = os.getenv('MPESA_CALLBACK_TOKEN')
    if configured_token and not hmac.compare_digest(request.args.get('token', ''), configured_token):
        return error('Invalid callback token', 403)
    callback = (request.get_json(silent=True) or {}).get('Body', {}).get('stkCallback', {})
    checkout_id = callback.get('CheckoutRequestID')
    payment = Payment.query.filter_by(provider='mpesa', provider_reference=checkout_id).first()
    if payment:
        succeeded = str(callback.get('ResultCode')) == '0'
        # A late/replayed unsuccessful callback must never undo a completed payment.
        if payment.status != 'paid' or succeeded:
            payment.status = 'paid' if succeeded else 'failed'
            if succeeded:
                payment.order.status = 'paid'
            payment.provider_response = callback
            db.session.commit()
    # Safaricom expects a successful acknowledgement even when an old callback is replayed.
    return jsonify({'ResultCode': 0, 'ResultDesc': 'Accepted'}), 200


@app.route('/api/payments/<int:payment_id>', methods=['GET'])
@jwt_required()
def payment_status(payment_id):
    payment = db.session.get(Payment, payment_id)
    if not payment: return error('Payment not found', 404)
    if payment.order.user_id != int(get_jwt_identity()): return error('Access denied', 403)
    return jsonify(payment.to_dict()), 200

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)
