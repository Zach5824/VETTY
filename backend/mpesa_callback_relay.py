"""Narrow public relay for Daraja callbacks during local development.

Run this on port 5001 and tunnel only that port. It exposes one token-protected
endpoint and forwards valid callbacks to the local Vetty API on port 5000.
"""
import hmac
import os

import requests
from dotenv import load_dotenv
from flask import Flask, Response, jsonify, request

load_dotenv()
app = Flask(__name__)
CALLBACK_TOKEN = os.environ.get("MPESA_CALLBACK_TOKEN", "")
# This can use a different port when another local application already owns 5000.
LOCAL_CALLBACK_URL = os.environ.get(
    "MPESA_LOCAL_CALLBACK_URL",
    "http://127.0.0.1:5000/api/payments/mpesa/callback",
)


@app.post("/mpesa-callback")
def relay_callback():
    token = request.args.get("token", "")
    if not CALLBACK_TOKEN or not hmac.compare_digest(token, CALLBACK_TOKEN):
        return jsonify(error="Invalid callback token"), 403
    try:
        response = requests.post(
            LOCAL_CALLBACK_URL,
            params={"token": CALLBACK_TOKEN},
            data=request.get_data(),
            headers={"Content-Type": "application/json"},
            timeout=15,
        )
        return Response(response.content, status=response.status_code, content_type="application/json")
    except requests.RequestException:
        return jsonify(error="Local Vetty API is unavailable"), 502


@app.get("/health")
def health():
    return jsonify(status="ok")


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5001, debug=False)
