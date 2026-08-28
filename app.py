import os
from datetime import timedelta
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from datetime import datetime

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

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)