from flask import Blueprint, request, jsonify
from models import db, Order

orders_bp = Blueprint('orders', __name__)

@orders_bp.route('/api/orders', methods=['GET', 'POST'])
def handle_orders():
    # GET: Retrieve all orders
    if request.method == 'GET':
        orders = Order.query.order_by(Order.id.desc()).all()
        return jsonify([order.to_dict() for order in orders]), 200

    # POST: Create a new order
    if request.method == 'POST':
        data = request.get_json() or {}
        user_id = data.get("user_id")
        total_amount = data.get("total_amount")

        if not user_id or not total_amount:
            return jsonify({"error": "Missing required fields"}), 400

        new_order = Order(
            user_id=user_id,
            total_amount=total_amount,
            status="pending"
        )
        
        db.session.add(new_order)
        db.session.commit()

        return jsonify(new_order.to_dict()), 201