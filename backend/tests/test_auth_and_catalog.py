import importlib.util
import sys
from pathlib import Path

from werkzeug.security import generate_password_hash


APP_PATH = Path(__file__).resolve().parents[1] / 'vetty_api.py'


def load_app(tmp_path, monkeypatch):
    monkeypatch.setenv('DATABASE_URL', f"sqlite:///{tmp_path / 'vetty.db'}")
    monkeypatch.setenv('JWT_SECRET_KEY', 'test-secret-that-is-at-least-32-characters')
    spec = importlib.util.spec_from_file_location('vetty_catalog_api', APP_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    with module.app.app_context():
        module.db.create_all()
        module.db.session.add(module.User(username='admin', email='admin@example.test', role='admin', password_hash=generate_password_hash('Password123!')))
        module.db.session.commit()
    return module


def test_password_auth_and_admin_catalog_protection(tmp_path, monkeypatch):
    module = load_app(tmp_path, monkeypatch)
    client = module.app.test_client()
    assert client.get('/').get_json()['status'] == 'ok'
    assert client.get('/api/health').get_json() == {'status': 'ok'}
    missing = client.get('/api/not-a-route')
    assert missing.status_code == 404
    assert missing.get_json()['error'] == 'API endpoint not found'
    signup = client.post('/api/auth/signup', json={'username': 'jane', 'email': 'jane@example.test', 'password': 'Password123!'})
    assert signup.status_code == 201
    customer_token = signup.get_json()['access_token']
    # A later, separate login must use the credentials persisted at signup.
    customer_login = client.post('/api/auth/login', json={'email': 'jane@example.test', 'password': 'Password123!'})
    assert customer_login.status_code == 200
    assert customer_login.get_json()['user']['username'] == 'jane'
    assert client.post('/api/auth/login', json={'email': 'jane@example.test', 'password': 'wrong-password'}).status_code == 401
    photo = 'data:image/png;base64,iVBORw0KGgo='
    saved_photo = client.patch('/api/auth/me', headers={'Authorization': f'Bearer {customer_token}'}, json={'profile_photo': photo})
    assert saved_photo.status_code == 200
    assert client.post('/api/auth/login', json={'email': 'jane@example.test', 'password': 'Password123!'}).get_json()['user']['profile_photo'] == photo
    cart = [{'productId': '1', 'qty': 2, 'selected': False}]
    saved_cart = client.put('/api/cart', headers={'Authorization': f'Bearer {customer_token}'}, json={'items': cart})
    assert saved_cart.status_code == 200
    assert client.get('/api/cart', headers={'Authorization': f'Bearer {customer_token}'}).get_json()['items'] == cart
    assert client.post('/api/products', json={'name': 'Food', 'price': 500, 'category': 'Food'}).status_code == 403

    admin_login = client.post('/api/auth/login', json={'email': 'admin@example.test', 'password': 'Password123!'})
    admin_token = admin_login.get_json()['access_token']
    created = client.post('/api/products', headers={'Authorization': f'Bearer {admin_token}'}, json={'name': 'Food', 'price': 500, 'category': 'Food'})
    assert created.status_code == 201
    assert client.get('/api/products').get_json()[0]['name'] == 'Food'
    service = client.post('/api/services', headers={'Authorization': f'Bearer {admin_token}'}, json={'name': 'Checkup', 'price': 1000, 'duration': '30 min'}).get_json()
    booking = client.post('/api/bookings', headers={'Authorization': f'Bearer {customer_token}'}, json={'service_id': service['id'], 'pet_name': 'Milo', 'appointment_at': '2026-09-01 10:00'})
    assert booking.status_code == 201
    assert booking.get_json()['customer'] == 'jane'
    assert client.get('/api/auth/me', headers={'Authorization': f'Bearer {customer_token}'}).get_json()['user']['email'] == 'jane@example.test'


def test_booking_ownership_and_admin_catalog_crud(tmp_path, monkeypatch):
    module = load_app(tmp_path, monkeypatch)
    client = module.app.test_client()
    admin_token = client.post('/api/auth/login', json={'email': 'admin@example.test', 'password': 'Password123!'}).get_json()['access_token']
    admin_headers = {'Authorization': f'Bearer {admin_token}'}
    owner_token = client.post('/api/auth/signup', json={'username': 'owner', 'email': 'owner@example.test', 'password': 'Password123!'}).get_json()['access_token']
    other_token = client.post('/api/auth/signup', json={'username': 'other', 'email': 'other@example.test', 'password': 'Password123!'}).get_json()['access_token']

    service = client.post('/api/services', headers=admin_headers, json={'name': 'Exam', 'price': 1000, 'duration': '30 min'}).get_json()
    booking = client.post('/api/bookings', headers={'Authorization': f'Bearer {owner_token}'}, json={'service_id': service['id'], 'pet_name': 'Milo', 'appointment_at': '2026-09-01 10:00'}).get_json()
    booking_url = f"/api/bookings/{booking['id']}"
    assert client.patch(booking_url, headers={'Authorization': f'Bearer {other_token}'}, json={'pet_name': 'Stolen'}).status_code == 403
    assert client.delete(booking_url, headers={'Authorization': f'Bearer {other_token}'}).status_code == 403
    assert client.patch(booking_url, headers={'Authorization': f'Bearer {owner_token}'}, json={'status': 'approved'}).get_json()['status'] == 'pending'
    assert client.patch(booking_url, headers=admin_headers, json={'status': 'approved'}).get_json()['status'] == 'approved'

    zone = client.post('/api/zones', headers=admin_headers, json={'name': 'Zone D', 'fee': 500, 'eta': '60 min'}).get_json()
    assert client.patch(f"/api/zones/{zone['id']}", headers={'Authorization': f'Bearer {owner_token}'}, json={'fee': 1}).status_code == 403
    assert client.patch(f"/api/zones/{zone['id']}", headers=admin_headers, json={'fee': 550}).get_json()['fee'] == 550.0
    assert client.delete(f"/api/zones/{zone['id']}", headers=admin_headers).status_code == 204


def test_admin_order_fulfilment_is_persistent_and_protected(tmp_path, monkeypatch):
    module = load_app(tmp_path, monkeypatch)
    client = module.app.test_client()
    admin_token = client.post('/api/auth/login', json={'email': 'admin@example.test', 'password': 'Password123!'}).get_json()['access_token']
    customer_token = client.post('/api/auth/signup', json={'username': 'buyer', 'email': 'buyer@example.test', 'password': 'Password123!'}).get_json()['access_token']
    order = client.post('/api/orders', headers={'Authorization': f'Bearer {customer_token}'}, json={
        'total_amount': 1450,
        'items': [{'productId': '1', 'qty': 1}],
    })
    assert order.status_code == 201
    order_id = order.get_json()['id']
    assert order.get_json()['items'] == [{'productId': '1', 'qty': 1}]
    assert client.get('/api/admin/orders', headers={'Authorization': f'Bearer {customer_token}'}).status_code == 403
    orders = client.get('/api/admin/orders', headers={'Authorization': f'Bearer {admin_token}'}).get_json()
    assert orders[0]['id'] == order_id
    assert orders[0]['customer'] == 'buyer'
    updated = client.patch(f'/api/admin/orders/{order_id}', headers={'Authorization': f'Bearer {admin_token}'}, json={'status': 'approved'})
    assert updated.status_code == 200
    assert updated.get_json()['status'] == 'approved'
