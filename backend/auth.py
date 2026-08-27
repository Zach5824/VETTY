"""Authentication and authorization helpers shared by API routes."""

from flask import jsonify
from flask_jwt_extended import get_jwt_identity

from database import db
from models import User


def error(message, status=400):
    return jsonify({'error': message}), status


def current_user():
    identity = get_jwt_identity()
    return db.session.get(User, int(identity)) if identity else None


def admin_required():
    user = current_user()
    if not user or user.role != 'admin':
        return error('Administrator privileges required', 403)
    return None
