"""Database models for Vetty's catalogue, accounts, bookings, and payments."""

from datetime import datetime

from database import db


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=True)
    role = db.Column(db.String(20), nullable=False, default='customer')
    orders = db.relationship('Order', backref='user', lazy=True)

    def to_dict(self):
        return {'id': self.id, 'username': self.username, 'email': self.email, 'role': self.role}


class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    description = db.Column(db.Text, nullable=False, default='')
    price = db.Column(db.Numeric(12, 2), nullable=False)
    category = db.Column(db.String(80), nullable=False)
    stock = db.Column(db.Integer, nullable=False, default=0)
    threshold = db.Column(db.Integer, nullable=False, default=10)
    icon = db.Column(db.String(60), nullable=False, default='Package')

    def to_dict(self):
        return {'id': str(self.id), 'name': self.name, 'desc': self.description, 'price': float(self.price), 'category': self.category, 'stock': self.stock, 'threshold': self.threshold, 'icon': self.icon}


class Service(db.Model):
    __tablename__ = 'services'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    description = db.Column(db.Text, nullable=False, default='')
    price = db.Column(db.Numeric(12, 2), nullable=False)
    duration = db.Column(db.String(50), nullable=False)
    icon = db.Column(db.String(60), nullable=False, default='Stethoscope')

    def to_dict(self):
        return {'id': str(self.id), 'name': self.name, 'desc': self.description, 'price': float(self.price), 'duration': self.duration, 'icon': self.icon}


class DeliveryZone(db.Model):
    __tablename__ = 'delivery_zones'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False, unique=True)
    fee = db.Column(db.Numeric(12, 2), nullable=False, default=0)
    eta = db.Column(db.String(80), nullable=False)

    def to_dict(self):
        return {'id': str(self.id), 'name': self.name, 'fee': float(self.fee), 'eta': self.eta}


class Booking(db.Model):
    __tablename__ = 'bookings'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey('services.id'), nullable=False)
    pet_name = db.Column(db.String(100), nullable=False)
    appointment_at = db.Column(db.String(80), nullable=False)
    notes = db.Column(db.Text, nullable=False, default='')
    status = db.Column(db.String(30), nullable=False, default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    service = db.relationship('Service')
    user = db.relationship('User')

    def to_dict(self):
        return {'id': str(self.id), 'serviceId': str(self.service_id), 'serviceName': self.service.name, 'petName': self.pet_name, 'date': self.appointment_at, 'notes': self.notes, 'price': float(self.service.price), 'status': self.status, 'customer': self.user.username}


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
        return {'id': self.id, 'order_id': self.order_id, 'provider': self.provider, 'provider_reference': self.provider_reference, 'status': self.status, 'amount': float(self.amount), 'phone': self.phone, 'created_at': self.created_at.isoformat()}
