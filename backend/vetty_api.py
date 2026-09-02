import os
import base64
import hmac
import sys
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from datetime import timedelta
from pathlib import Path
from flask import Flask, jsonify, request
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from flasgger import Flasgger
from sqlalchemy import inspect, text
from datetime import datetime
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash

# Support both `flask --app vetty_api` from backend/ and importing this WSGI
# module from the repository root (as the verification suite and Vercel do).
backend_directory = str(Path(__file__).resolve().parent)
if backend_directory not in sys.path:
    sys.path.insert(0, backend_directory)

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
jwt_secret = os.environ.get('JWT_SECRET_KEY')
if not jwt_secret or jwt_secret.startswith('replace-'):
    raise RuntimeError('JWT_SECRET_KEY must be set to a long, unique secret')
app.config['JWT_SECRET_KEY'] = jwt_secret
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
# An absolute path makes the local database location predictable even when the
# app is started from the repository root rather than the backend directory.
database_url = os.environ.get('DATABASE_URL', f"sqlite:///{os.path.join(runtime_dir, 'vetty.db')}")
# Neon supplies a generic ``postgresql://`` URL.  Explicitly select the
# psycopg v3 driver that is included in requirements.txt instead of SQLAlchemy's
# legacy psycopg2 default.
if database_url.startswith('postgresql://'):
    database_url = f"postgresql+psycopg://{database_url[len('postgresql://'):]}"
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

# Initialize Flasgger for Swagger UI documentation
swagger = Flasgger(app, config={
    "headers": [],
    "specs": [
        {
            "endpoint": 'apispec',
            "route": '/apispec.json',
            "rule_filter": lambda rule: not rule.endpoint.startswith(('static', 'swaggerui')),
            "model_filter": lambda tag: True,
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/api/docs",
    "info": {
        "title": "Vetty API",
        "version": "1.0.0",
        "description": "Pet-care marketplace API for Kenya"
    }
})

@jwt.unauthorized_loader
def missing_token(reason):
    return jsonify({'error': 'Authentication required', 'detail': reason}), 401


@jwt.invalid_token_loader
def invalid_token(reason):
    return jsonify({'error': 'Invalid authentication token', 'detail': reason}), 401


@jwt.expired_token_loader
def expired_token(_jwt_header, _jwt_payload):
    return jsonify({'error': 'Authentication token has expired'}), 401

@app.route('/', methods=['GET'])
@app.route('/api', methods=['GET'])
@app.route('/api/', methods=['GET'])
def api_index():
    """
    Make the backend URL useful when opened directly in a browser.
    ---
    tags:
      - API Info
    responses:
      200:
        description: API information and available endpoints
        schema:
          type: object
          properties:
            service:
              type: string
              example: "Vetty API"
            status:
              type: string
              example: "ok"
            health:
              type: string
              example: "/api/health"
            authentication:
              type: string
              example: "/api/auth/login"
    """
    return jsonify({
        'service': 'Vetty API',
        'status': 'ok',
        'health': '/api/health',
        'authentication': '/api/auth/login',
    }), 200


@app.route('/api/health', methods=['GET'])
def health():
    """
    Lightweight endpoint for deployment and frontend connectivity checks.
    ---
    tags:
      - Health Check
    responses:
      200:
        description: Health check passed
        schema:
          type: object
          properties:
            status:
              type: string
              example: "ok"
    """
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
    if 'profile_photo' not in columns:
        upgrades.append('ALTER TABLE users ADD COLUMN profile_photo TEXT')
    for statement in upgrades:
        db.session.execute(text(statement))
    if 'email' not in columns:
        db.session.execute(text('CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email)'))
    if upgrades:
        db.session.commit()


def upgrade_user_schema():
    """Apply additive user-profile upgrades on both SQLite and PostgreSQL."""
    columns = {column['name'] for column in inspect(db.engine).get_columns('users')}
    additions = []
    if 'profile_photo' not in columns:
        additions.append('ALTER TABLE users ADD COLUMN profile_photo TEXT')
    if 'cart_items' not in columns:
        additions.append('ALTER TABLE users ADD COLUMN cart_items JSON')
    for statement in additions:
        db.session.execute(text(statement))
    if 'cart_items' not in columns:
        db.session.execute(text("UPDATE users SET cart_items = '[]' WHERE cart_items IS NULL"))
    if additions:
        db.session.commit()


def upgrade_order_schema():
    """Add the order item snapshot required by the persistent admin view."""
    columns = {column['name'] for column in inspect(db.engine).get_columns('orders')}
    if 'items' not in columns:
        db.session.execute(text('ALTER TABLE orders ADD COLUMN items JSON'))
        db.session.execute(text("UPDATE orders SET items = '[]' WHERE items IS NULL"))
        db.session.commit()


def provision_initial_admin():
    """Create the first administrator from deployment environment variables.

    This intentionally never changes an existing account or its password. It
    makes a fresh production database usable without committing demo credentials.
    """
    email = str(os.getenv('INITIAL_ADMIN_EMAIL') or '').strip().lower()
    password = str(os.getenv('INITIAL_ADMIN_PASSWORD') or '')
    if not email and not password:
        return
    if '@' not in email or len(password) < 12:
        raise RuntimeError('INITIAL_ADMIN_EMAIL and a 12+ character INITIAL_ADMIN_PASSWORD are required together')
    user = User.query.filter_by(email=email).first()
    if not user:
        username = str(os.getenv('INITIAL_ADMIN_USERNAME') or email.split('@', 1)[0]).strip()[:80]
        db.session.add(User(username=username, email=email, role='admin', password_hash=generate_password_hash(password)))
        db.session.commit()
    elif user.role != 'admin':
        user.role = 'admin'
        db.session.commit()


def initialize_database():
    """Create the application schema and upgrade legacy local SQLite files."""
    db.create_all()
    if db.engine.dialect.name == 'sqlite':
        upgrade_local_schema()
    upgrade_user_schema()
    upgrade_order_schema()
    provision_initial_admin()


with app.app_context():
    initialize_database()


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


def validated_order_amount(amount):
    """Parse an order amount safely before it is persisted or sent to a PSP."""
    try:
        result = Decimal(str(amount)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    except (InvalidOperation, ValueError):
        raise ValueError('total_amount must be a valid monetary amount')
    if not result.is_finite() or result <= 0:
        raise ValueError('total_amount must be greater than zero')
    return result


def validated_order_items(items):
    """Persist only the product identifiers and quantities needed for fulfilment."""
    if items is None:
        return []
    if not isinstance(items, list) or len(items) > 100:
        raise ValueError('items must be a list with no more than 100 entries')
    cleaned = []
    for item in items:
        if not isinstance(item, dict):
            raise ValueError('each order item must be an object')
        product_id = item.get('productId')
        quantity = item.get('qty')
        try:
            product_id = int(product_id)
            quantity = int(quantity)
        except (TypeError, ValueError):
            raise ValueError('each order item needs a valid productId and qty')
        if product_id < 1 or quantity < 1 or quantity > 1000:
            raise ValueError('each order item needs a positive productId and qty')
        cleaned.append({'productId': str(product_id), 'qty': quantity})
    return cleaned


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
    """
    Register a new user account.
    ---
    tags:
      - Authentication
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            username:
              type: string
              example: "john_doe"
              minLength: 2
            email:
              type: string
              format: email
              example: "john@example.com"
            password:
              type: string
              format: password
              example: "SecurePass123"
              minLength: 8
    responses:
      201:
        description: User account created successfully
        schema:
          type: object
          properties:
            user:
              type: object
              properties:
                id:
                  type: integer
                username:
                  type: string
                email:
                  type: string
                role:
                  type: string
            access_token:
              type: string
            token_type:
              type: string
      400:
        description: Invalid input parameters
      409:
        description: Username or email already exists
    """
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
    """
    Login with email or username and password.
    ---
    tags:
      - Authentication
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            email:
              type: string
              format: email
              example: "john@example.com"
            username:
              type: string
              example: "john_doe"
            password:
              type: string
              format: password
              example: "SecurePass123"
          required:
            - password
    responses:
      200:
        description: Login successful
        schema:
          type: object
          properties:
            user:
              type: object
            access_token:
              type: string
            token_type:
              type: string
      401:
        description: Invalid email or password
    """
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
    """
    Get current user profile.
    ---
    tags:
      - Authentication
    security:
      - Bearer: []
    responses:
      200:
        description: Current user information
        schema:
          type: object
          properties:
            user:
              type: object
              properties:
                id:
                  type: integer
                username:
                  type: string
                email:
                  type: string
                role:
                  type: string
      401:
        description: Unauthorized - token missing or invalid
    """
    user = current_user()
    return jsonify({'user': user.to_dict()})


@app.route('/api/auth/me', methods=['PATCH'])
@jwt_required()
def update_profile():
    """Save the current customer's preferred profile photo."""
    user = current_user()
    data = request.get_json(silent=True) or {}
    profile_photo = data.get('profile_photo')
    if not isinstance(profile_photo, str) or not profile_photo.startswith('data:image/'):
        return error('A valid image is required')
    if len(profile_photo) > 3 * 1024 * 1024:
        return error('Profile photo is too large')
    user.profile_photo = profile_photo
    db.session.commit()
    return jsonify({'user': user.to_dict()})


def valid_cart_items(items):
    if not isinstance(items, list) or len(items) > 100:
        return None
    cleaned = []
    for item in items:
        if not isinstance(item, dict):
            return None
        product_id = item.get('productId')
        qty = item.get('qty')
        if not isinstance(product_id, str) or not product_id or isinstance(qty, bool):
            return None
        try:
            qty = int(qty)
        except (TypeError, ValueError):
            return None
        if qty < 1 or qty > 1000:
            return None
        cleaned.append({'productId': product_id, 'qty': qty, 'selected': bool(item.get('selected', True))})
    return cleaned


@app.route('/api/cart', methods=['GET', 'PUT'])
@jwt_required()
def account_cart():
    """Load or save the signed-in customer's cart across sessions."""
    user = current_user()
    if request.method == 'GET':
        return jsonify({'items': user.cart_items or []})
    items = valid_cart_items((request.get_json(silent=True) or {}).get('items'))
    if items is None:
        return error('Cart items are invalid')
    user.cart_items = items
    db.session.commit()
    return jsonify({'items': user.cart_items})


def apply_fields(model, data, fields):
    for name in fields:
        if name in data:
            setattr(model, name, data[name])


def catalog_response(model):
    return jsonify([item.to_dict() for item in model.query.order_by(model.id.desc()).all()])


@app.route('/api/products', methods=['GET', 'POST'])
@jwt_required(optional=True)
def products():
    """
    Get all products or create a new product.
    ---
    tags:
      - Products
    parameters:
      - in: body
        name: body
        required: false
        description: Required only for POST requests (admin only)
        schema:
          type: object
          properties:
            name:
              type: string
              example: "Dog Food"
            price:
              type: number
              example: 2500.00
            category:
              type: string
              example: "Food"
            desc:
              type: string
              example: "Premium dog food"
            stock:
              type: integer
              example: 50
            threshold:
              type: integer
              example: 10
            icon:
              type: string
              example: "Package"
          required:
            - name
            - price
            - category
    responses:
      200:
        description: List of all products (GET)
        schema:
          type: array
          items:
            type: object
      201:
        description: Product created successfully (POST, admin only)
      400:
        description: Missing required fields
      403:
        description: Admin access required for POST
    """
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
    """
    Get, update, or delete a product.
    ---
    tags:
      - Products
    parameters:
      - in: path
        name: product_id
        type: integer
        required: true
        description: Product ID
      - in: body
        name: body
        required: false
        description: Fields to update (PATCH only, admin required)
        schema:
          type: object
          properties:
            name:
              type: string
            price:
              type: number
            category:
              type: string
            description:
              type: string
            stock:
              type: integer
            threshold:
              type: integer
            icon:
              type: string
    responses:
      200:
        description: Product details
        schema:
          type: object
      204:
        description: Product deleted successfully (DELETE)
      404:
        description: Product not found
      403:
        description: Admin access required for PATCH/DELETE
    """
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
    """
    Get all services or create a new service.
    ---
    tags:
      - Services
    parameters:
      - in: body
        name: body
        required: false
        description: Required only for POST requests (admin only)
        schema:
          type: object
          properties:
            name:
              type: string
              example: "Veterinary Checkup"
            price:
              type: number
              example: 5000.00
            duration:
              type: string
              example: "1 hour"
            desc:
              type: string
              example: "General health checkup"
            icon:
              type: string
              example: "Stethoscope"
          required:
            - name
            - price
            - duration
    responses:
      200:
        description: List of all services (GET)
        schema:
          type: array
          items:
            type: object
      201:
        description: Service created successfully (POST, admin only)
      400:
        description: Missing required fields
      403:
        description: Admin access required for POST
    """
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
    """
    Get, update, or delete a service.
    ---
    tags:
      - Services
    parameters:
      - in: path
        name: service_id
        type: integer
        required: true
        description: Service ID
      - in: body
        name: body
        required: false
        description: Fields to update (PATCH only, admin required)
        schema:
          type: object
          properties:
            name:
              type: string
            price:
              type: number
            duration:
              type: string
            description:
              type: string
            icon:
              type: string
    responses:
      200:
        description: Service details
        schema:
          type: object
      204:
        description: Service deleted successfully (DELETE)
      404:
        description: Service not found
      403:
        description: Admin access required for PATCH/DELETE
    """
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
    """
    Get all delivery zones or create a new zone.
    ---
    tags:
      - Delivery Zones
    parameters:
      - in: body
        name: body
        required: false
        description: Required only for POST requests (admin only)
        schema:
          type: object
          properties:
            name:
              type: string
              example: "Nairobi CBD"
            fee:
              type: number
              example: 500.00
            eta:
              type: string
              example: "2 hours"
          required:
            - name
            - eta
    responses:
      200:
        description: List of all delivery zones (GET)
        schema:
          type: array
          items:
            type: object
      201:
        description: Delivery zone created successfully (POST, admin only)
      400:
        description: Missing required fields
      403:
        description: Admin access required for POST
    """
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
    """
    Update or delete a delivery zone (admin only).
    ---
    tags:
      - Delivery Zones
    parameters:
      - in: path
        name: zone_id
        type: integer
        required: true
        description: Zone ID
      - in: body
        name: body
        required: false
        description: Fields to update (PATCH only)
        schema:
          type: object
          properties:
            name:
              type: string
            fee:
              type: number
            eta:
              type: string
    responses:
      200:
        description: Delivery zone updated
        schema:
          type: object
      204:
        description: Delivery zone deleted successfully (DELETE)
      404:
        description: Delivery zone not found
      403:
        description: Admin access required
    """
    auth_error = admin_required()
    if auth_error: return auth_error
    zone = db.session.get(DeliveryZone, zone_id)
    if not zone: return error('Delivery zone not found', 404)
    if request.method == 'DELETE': db.session.delete(zone); db.session.commit(); return '', 204
    apply_fields(zone, request.get_json(silent=True) or {}, ('name', 'fee', 'eta')); db.session.commit(); return jsonify(zone.to_dict())


@app.route('/api/bookings', methods=['GET', 'POST'])
@jwt_required()
def bookings():
    """
    Get user bookings or create a new booking.
    ---
    tags:
      - Bookings
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: false
        description: Required only for POST requests
        schema:
          type: object
          properties:
            service_id:
              type: integer
              example: 1
            pet_name:
              type: string
              example: "Max"
            appointment_at:
              type: string
              format: date-time
              example: "2024-09-15T14:30:00"
            notes:
              type: string
              example: "Pet has allergies"
          required:
            - service_id
            - pet_name
            - appointment_at
    responses:
      200:
        description: List of user bookings (GET)
        schema:
          type: array
          items:
            type: object
      201:
        description: Booking created successfully (POST)
      400:
        description: Missing required fields
      401:
        description: Unauthorized - token required
    """
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
    """
    Update or delete a booking.
    ---
    tags:
      - Bookings
    security:
      - Bearer: []
    parameters:
      - in: path
        name: booking_id
        type: integer
        required: true
        description: Booking ID
      - in: body
        name: body
        required: false
        description: Fields to update (PATCH only)
        schema:
          type: object
          properties:
            pet_name:
              type: string
            appointment_at:
              type: string
              format: date-time
            notes:
              type: string
            status:
              type: string
              description: Admin only
    responses:
      200:
        description: Booking updated
        schema:
          type: object
      204:
        description: Booking deleted successfully (DELETE)
      404:
        description: Booking not found
      403:
        description: Access denied
    """
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
    """
    Create a new order.
    ---
    tags:
      - Orders
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            total_amount:
              type: number
              example: 5000.00
          required:
            - total_amount
    responses:
      201:
        description: Order created successfully
        schema:
          type: object
          properties:
            id:
              type: integer
            user_id:
              type: integer
            total_amount:
              type: number
            status:
              type: string
            created_at:
              type: string
      400:
        description: Missing total_amount
      401:
        description: Unauthorized - token required
    """
    current_user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    total_amount = data.get('total_amount')
    if total_amount is None:
        return error('total_amount is required')
    try:
        total_amount = validated_order_amount(total_amount)
        items = validated_order_items(data.get('items'))
    except ValueError as exc:
        return error(str(exc))

    new_order = Order(
        user_id=int(current_user_id),
        total_amount=float(total_amount),
        status='pending',
        items=items,
    )
    
    db.session.add(new_order)
    db.session.commit()
    
    return jsonify(new_order.to_dict()), 201

@app.route('/api/orders', methods=['GET'])
@jwt_required()
def get_user_orders():
    """
    Get all orders for the current user.
    ---
    tags:
      - Orders
    security:
      - Bearer: []
    responses:
      200:
        description: List of user orders
        schema:
          type: array
          items:
            type: object
            properties:
              id:
                type: integer
              user_id:
                type: integer
              total_amount:
                type: number
              status:
                type: string
              created_at:
                type: string
      401:
        description: Unauthorized - token required
    """
    current_user_id = get_jwt_identity()
    orders = Order.query.filter_by(user_id=int(current_user_id)).order_by(Order.created_at.desc()).all()
    return jsonify([order.to_dict() for order in orders]), 200


@app.route('/api/admin/orders', methods=['GET'])
@jwt_required()
def admin_orders():
    """Return all orders for staff fulfilment, including the customer name."""
    auth_error = admin_required()
    if auth_error: return auth_error
    orders = Order.query.order_by(Order.created_at.desc()).all()
    return jsonify([order.to_dict(include_customer=True) for order in orders])


@app.route('/api/admin/orders/<int:order_id>', methods=['PATCH'])
@jwt_required()
def admin_order_detail(order_id):
    """Update an order's fulfilment status as an administrator."""
    auth_error = admin_required()
    if auth_error: return auth_error
    order = db.session.get(Order, order_id)
    if not order: return error('Order not found', 404)
    status = str((request.get_json(silent=True) or {}).get('status') or '').strip().lower()
    if status not in {'pending', 'approved', 'rejected', 'out_for_delivery', 'delivered'}:
        return error('status must be pending, approved, rejected, out_for_delivery, or delivered')
    order.status = status
    db.session.commit()
    return jsonify(order.to_dict(include_customer=True))


# Payment providers ---------------------------------------------------------
# The client supplies only an order id. Amounts always come from our database.

@app.route('/api/payments/stripe/intents', methods=['POST'])
@jwt_required()
def create_stripe_payment_intent():
    """
    Create a Stripe PaymentIntent for checkout.
    ---
    tags:
      - Payments - Stripe
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            order_id:
              type: integer
              example: 1
          required:
            - order_id
    responses:
      201:
        description: PaymentIntent created successfully
        schema:
          type: object
          properties:
            payment:
              type: object
            client_secret:
              type: string
            publishable_key:
              type: string
      400:
        description: Invalid order
      403:
        description: Access denied - order belongs to another user
      409:
        description: Payment already pending for this order
      503:
        description: Payment provider not configured
    """
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
    """
    Stripe webhook endpoint for payment events.
    ---
    tags:
      - Payments - Stripe
    responses:
      200:
        description: Webhook received and processed
      400:
        description: Invalid webhook signature
      503:
        description: Stripe not configured
    """
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
    """
    Initiate M-Pesa STK Push payment.
    ---
    tags:
      - Payments - M-Pesa
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            order_id:
              type: integer
              example: 1
            phone:
              type: string
              example: "254712345678"
          required:
            - order_id
            - phone
    responses:
      201:
        description: STK Push initiated successfully
        schema:
          type: object
          properties:
            payment:
              type: object
            merchant_request_id:
              type: string
            customer_message:
              type: string
      400:
        description: Invalid order or phone number
      403:
        description: Access denied
      409:
        description: Payment already pending
      503:
        description: M-Pesa not configured
    """
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
    """
    Query the status of an M-Pesa STK Push payment.
    ---
    tags:
      - Payments - M-Pesa
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            payment_id:
              type: integer
              example: 1
          required:
            - payment_id
    responses:
      200:
        description: Payment status retrieved
        schema:
          type: object
          properties:
            payment:
              type: object
            provider_result:
              type: object
      404:
        description: Payment not found
      403:
        description: Access denied
      503:
        description: M-Pesa not configured
    """
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
    """
    M-Pesa callback endpoint for payment notifications.
    ---
    tags:
      - Payments - M-Pesa
    parameters:
      - in: query
        name: token
        type: string
        required: false
        description: Callback validation token
    responses:
      200:
        description: Callback received and processed
      403:
        description: Invalid callback token
    """
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
    """
    Get payment details and status.
    ---
    tags:
      - Payments
    security:
      - Bearer: []
    parameters:
      - in: path
        name: payment_id
        type: integer
        required: true
        description: Payment ID
    responses:
      200:
        description: Payment details
        schema:
          type: object
      404:
        description: Payment not found
      403:
        description: Access denied
    """
    payment = db.session.get(Payment, payment_id)
    if not payment: return error('Payment not found', 404)
    if payment.order.user_id != int(get_jwt_identity()): return error('Access denied', 403)
    return jsonify(payment.to_dict()), 200

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)
