"""Mocked Daraja contract tests for the STK Push integration."""
import importlib.util
import os
import sys
from pathlib import Path
from unittest.mock import Mock, patch

import pytest


APP_PATH = Path(__file__).resolve().parents[1] / "app.py"


@pytest.fixture()
def payment_app(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'payments.db'}")
    monkeypatch.setenv("JWT_SECRET_KEY", "test-secret-that-is-at-least-32-bytes")
    monkeypatch.setenv("MPESA_ENV", "sandbox")
    monkeypatch.setenv("MPESA_CONSUMER_KEY", "consumer-key")
    monkeypatch.setenv("MPESA_CONSUMER_SECRET", "consumer-secret")
    monkeypatch.setenv("MPESA_SHORTCODE", "174379")
    monkeypatch.setenv("MPESA_PASSKEY", "sandbox-passkey")
    monkeypatch.setenv("MPESA_CALLBACK_TOKEN", "callback-secret")
    monkeypatch.setenv(
        "MPESA_CALLBACK_URL",
        "https://example.test/mpesa-callback?token=callback-secret",
    )
    spec = importlib.util.spec_from_file_location("vetty_payment_api", APP_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    with module.app.app_context():
        module.db.create_all()
    yield module
    sys.modules.pop(spec.name, None)


def response(payload):
    result = Mock()
    result.json.return_value = payload
    result.raise_for_status.return_value = None
    return result


def customer_and_order(app):
    client = app.app.test_client()
    login = client.post("/api/login", json={"username": "mpesa-test-customer"})
    token = login.get_json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    order = client.post("/api/orders", headers=headers, json={"total_amount": 1250}).get_json()
    return client, headers, order["id"]


def test_stk_push_uses_server_order_amount_and_callback_marks_order_paid(payment_app):
    client, headers, order_id = customer_and_order(payment_app)
    oauth = response({"access_token": "daraja-token"})
    stk = response({
        "ResponseCode": "0",
        "CheckoutRequestID": "ws_CO_123",
        "MerchantRequestID": "merchant_123",
        "CustomerMessage": "Success. Request accepted for processing",
    })

    with patch("requests.get", return_value=oauth) as get, patch("requests.post", return_value=stk) as post:
        result = client.post(
            "/api/payments/mpesa/stk-push",
            headers=headers,
            json={"order_id": order_id, "phone": "0712 345 678", "amount": 1},
        )

    assert result.status_code == 201
    body = result.get_json()
    assert body["payment"]["status"] == "initiated"
    get.assert_called_once()
    sent = post.call_args.kwargs["json"]
    assert sent["Amount"] == 1250
    assert sent["PhoneNumber"] == "254712345678"
    assert sent["CallBackURL"].endswith("token=callback-secret")

    callback = client.post(
        "/api/payments/mpesa/callback?token=callback-secret",
        json={"Body": {"stkCallback": {"CheckoutRequestID": "ws_CO_123", "ResultCode": "0"}}},
    )
    assert callback.status_code == 200
    status = client.get(f"/api/payments/{body['payment']['id']}", headers=headers)
    assert status.get_json()["status"] == "paid"


def test_stk_push_requires_callback_protection(payment_app, monkeypatch):
    monkeypatch.delenv("MPESA_CALLBACK_TOKEN")
    client, headers, order_id = customer_and_order(payment_app)
    result = client.post(
        "/api/payments/mpesa/stk-push",
        headers=headers,
        json={"order_id": order_id, "phone": "0712345678"},
    )
    assert result.status_code == 503
    assert "MPESA_CALLBACK_TOKEN" in result.get_json()["error"]
