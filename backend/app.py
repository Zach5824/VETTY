import os
import base64
import hmac
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from datetime import timedelta
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)

# Configurations
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'vetty-super-secret-key')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-super-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///vetty.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
jwt = JWTManager(app)
CORS(app)

# Database Models
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    orders = db.relationship('Order', backref='user', lazy=True)

class Order(db.Model):
    __tablename__ = 'orders'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='pending', nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Payment(db.Model):
    __tablename__ = 'payments'
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False, index=True)
    provider = db.Column(db.String(20), nullable=False)
    provider_reference = db.Column(db.String(255), nullable=False, unique=True, index=True)
    status = db.Column(db.String(30), nullable=False, default='initiated')
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    phone = db.Column(db.String(20))
    provider_response = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    order = db.relationship('Order', backref=db.backref('payments', lazy=True))

    def to_dict(self):
        return {
            'id': self.id, 'order_id': self.order_id, 'provider': self.provider,
            'provider_reference': self.provider_reference, 'status': self.status,
            'amount': float(self.amount), 'phone': self.phone,
            'created_at': self.created_at.isoformat()
        }


def error(message, status=400):
    return jsonify({'error': message}), status


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

# Auth Endpoints for Testing JWT Generation
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username')
    
    if not username:
        return jsonify({'msg': 'Username is required'}), 400
        
    user = User.query.filter_by(username=username).first()
    if not user:
        user = User(username=username)
        db.session.add(user)
        db.session.commit()
        
    access_token = create_access_token(identity=str(user.id))
    return jsonify({'access_token': access_token, 'user_id': user.id}), 200

# Protected Order Routes
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
