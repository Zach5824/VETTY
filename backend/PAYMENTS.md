# Payment setup

The payment API initiates payment only from a server-stored order amount. The frontend must never send an amount.

## Stripe

1. Set `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_CURRENCY` in `.env`. Use matching test-mode keys while developing.
2. The frontend calls `POST /api/payments/stripe/intents` with `{ "order_id": 123 }`, then confirms the returned `client_secret` with Stripe.js.
3. Configure Stripe to send `payment_intent.succeeded`, `payment_intent.payment_failed`, and `payment_intent.canceled` to `POST /api/payments/stripe/webhook`.

The webhook signature is verified before an order is marked `paid`. During local development, run `stripe listen --forward-to http://127.0.0.1:5000/api/payments/stripe/webhook`, then copy the displayed `whsec_...` value into `STRIPE_WEBHOOK_SECRET` and restart the backend. For a deployed backend, create a Stripe Dashboard webhook endpoint for `https://YOUR-BACKEND/api/payments/stripe/webhook` with the same three events and use that endpoint's signing secret.

## M-Pesa STK Push

1. Copy `.env.example` to `.env`, then set all `MPESA_*` values from your Safaricom Daraja app. Keep `MPESA_ENV=sandbox` until live credentials and a live shortcode are ready.
2. Expose `MPESA_CALLBACK_URL` through a public HTTPS domain or tunnel; localhost cannot receive Safaricom callbacks.
3. The frontend calls `POST /api/payments/mpesa/stk-push` with `{ "order_id": 123, "phone": "254712345678" }`.

The route requests a Daraja OAuth token, starts the STK prompt, and persists the checkout request ID. The callback then changes the payment/order state only after Safaricom’s result is received. `MPESA_CALLBACK_TOKEN` is required, and the same value must appear in the callback URL query string.

To query a pending STK Push manually, call `POST /api/payments/mpesa/query` with `{ "payment_id": 123 }` and the customer Bearer token. It uses the configured `MPESA_QUERY_URL`, which defaults to Safaricom’s sandbox `stkpushquery/v1/query` endpoint.

For safer local testing, run `python mpesa_callback_relay.py` on port 5001 and tunnel **only** that port. Set `MPESA_CALLBACK_URL` to `https://YOUR-TUNNEL/mpesa-callback?token=YOUR_CALLBACK_TOKEN`. The relay exposes only this protected callback path and forwards it to the local API on port 5000. If port 5000 is already in use, run the payment API on another port and set `MPESA_LOCAL_CALLBACK_URL` to its `/api/payments/mpesa/callback` endpoint before starting the relay.

Run `pytest tests/test_mpesa_payments.py -q` from `backend/` to validate the complete OAuth → STK request → callback state transition without charging a phone. A real sandbox prompt still requires the Daraja consumer key, consumer secret, and passkey from your own Safaricom app; those secrets are intentionally not stored in this repository.

## Postman

Create an authenticated order first. Then use either payment request with your customer Bearer token. Real payment initiation requires valid provider sandbox or live credentials.
