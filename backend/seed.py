"""Create a local Vetty demo database. Run: python seed.py"""
from werkzeug.security import generate_password_hash
from vetty_api import app, db, User, Product, Service, DeliveryZone, upgrade_local_schema

PRODUCTS = [
    {'name': 'Premium Cat Food 2kg', 'price': 1450, 'category': 'Food', 'stock': 42, 'threshold': 15, 'icon': 'Fish', 'description': 'Grain-free salmon recipe for adult cats.'},
    {'name': 'Dog Chew Toy', 'price': 650, 'category': 'Toys', 'stock': 8, 'threshold': 10, 'icon': 'Bone', 'description': 'Durable rubber chew toy for medium and large dogs.'},
    {'name': 'Fish Pellets 500g', 'price': 450, 'category': 'Food', 'stock': 15, 'threshold': 20, 'icon': 'Waves', 'description': 'Sinking pellets for tropical fish.'},
]
SERVICES = [
    {'name': 'Health Checkup', 'price': 1200, 'duration': '30 min', 'icon': 'Stethoscope', 'description': 'General wellness exam by a licensed vet.'},
    {'name': 'Dog Vaccination', 'price': 1800, 'duration': '20 min', 'icon': 'Syringe', 'description': 'Core vaccines for puppies and adult dogs.'},
]
ZONES = [
    {'name': 'Zone A — Nairobi CBD', 'fee': 200, 'eta': '15–30 min'},
    {'name': 'Zone B — Westlands / Kilimani', 'fee': 300, 'eta': '30–45 min'},
    {'name': 'Zone C — Karen / Langata', 'fee': 450, 'eta': '45–60 min'},
]


def seed_database():
    with app.app_context():
        db.create_all()
        upgrade_local_schema()
        if not User.query.filter_by(email='admin@vetty.co.ke').first():
            db.session.add(User(username='vetty-admin', email='admin@vetty.co.ke', role='admin', password_hash=generate_password_hash('ChangeMe123!')))
        if not Product.query.first(): db.session.add_all(Product(**item) for item in PRODUCTS)
        if not Service.query.first(): db.session.add_all(Service(**item) for item in SERVICES)
        if not DeliveryZone.query.first(): db.session.add_all(DeliveryZone(**item) for item in ZONES)
        db.session.commit()
    print('Vetty demo data ready. Change the documented admin password before deployment.')


if __name__ == '__main__':
    seed_database()
