import importlib.util
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest


APP_PATH = Path(__file__).resolve().parents[1] / "app.py"


@pytest.fixture
def payment_app(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'stripe-payments.db'}")
    monkeypatch.setenv("JWT_SECRET_KEY", "test-jwt-secret")
    monkeypatch.setenv("STRIPE_PUBLISHABLE_KEY", "pk_test_123")
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_123")
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_test_123")

    spec = importlib.util.spec_from_file_location("vetty_stripe_payment_api", APP_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with module.app.app_context():
        module.db.create_all()
    yield module
    with module.app.app_context():
        module.db.session.remove()
        module.db.drop_all()


def customer_and_order(module):
    client = module.app.test_client()
    login = client.post("/api/login", json={"username": "stripe-test-customer"})
    headers = {"Authorization": f"Bearer {login.get_json()['access_token']}"}
    order = client.post("/api/orders", headers=headers, json={"total_amount": 2500})
    return client, headers, order.get_json()["id"]


def test_stripe_intent_uses_order_amount_and_verified_webhook_marks_paid(payment_app, monkeypatch):
    module = payment_app
    calls = []

    class FakePaymentIntent:
        @staticmethod
        def create(**kwargs):
            calls.append(kwargs)
            return SimpleNamespace(id="pi_test_123", status="requires_payment_method", client_secret="pi_test_123_secret")

    class FakeWebhook:
        @staticmethod
        def construct_event(payload, signature, secret):
            assert payload == b"{}"
            assert signature == "valid-signature"
            assert secret == "whsec_test_123"
            return {
                "type": "payment_intent.succeeded",
                "data": {"object": {"id": "pi_test_123", "status": "succeeded"}},
            }

    fake_stripe = SimpleNamespace(PaymentIntent=FakePaymentIntent, Webhook=FakeWebhook)
    monkeypatch.setitem(sys.modules, "stripe", fake_stripe)

    client, headers, order_id = customer_and_order(module)
    response = client.post("/api/payments/stripe/intents", headers=headers, json={"order_id": order_id})

    assert response.status_code == 201
    body = response.get_json()
    assert body["client_secret"] == "pi_test_123_secret"
    assert body["publishable_key"] == "pk_test_123"
    assert calls[0]["amount"] == 250000
    assert calls[0]["currency"] == "kes"
    assert calls[0]["metadata"] == {"order_id": str(order_id), "user_id": "1"}

    webhook = client.post(
        "/api/payments/stripe/webhook",
        data=b"{}",
        headers={"Stripe-Signature": "valid-signature"},
    )
    assert webhook.status_code == 200

    payment = client.get(f"/api/payments/{body['payment']['id']}", headers=headers)
    assert payment.get_json()["status"] == "paid"
    with module.app.app_context():
        assert module.db.session.get(module.Order, order_id).status == "paid"


def test_stripe_webhook_rejects_invalid_signature(payment_app, monkeypatch):
    class FakeWebhook:
        @staticmethod
        def construct_event(*_args):
            raise ValueError("bad signature")

    monkeypatch.setitem(sys.modules, "stripe", SimpleNamespace(Webhook=FakeWebhook))
    response = payment_app.app.test_client().post("/api/payments/stripe/webhook", data=b"{}")
    assert response.status_code == 400
