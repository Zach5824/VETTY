# Vetty

Vetty is a full-stack pet-care marketplace for Kenyan pet owners. Customers can create secure accounts, browse products and veterinary services, book appointments, and pay for orders by M-Pesa or card. Administrators manage the catalogue, delivery zones, inventory, and booking fulfilment.

## Project brief

Pet owners commonly coordinate food, health services, and delivery through separate channels. Vetty brings these tasks into one mobile-first experience, while giving staff a protected administrative interface for managing the operational data behind it. The project demonstrates a React client, a REST API, relational persistence, JWT authentication, role-based authorization, payment-provider integration, and automated tests.

## Features

- Password-backed registration and sign-in with JWT sessions
- Server-enforced `customer` and `admin` roles; customers can access only their own orders, bookings, and payments
- Product, service, delivery-zone, and booking CRUD API; catalogue changes require an administrator
- Product cart, checkout, Stripe PaymentIntent flow, and M-Pesa STK Push flow
- Stripe webhook-signature verification and protected M-Pesa callback handling
- Responsive React interface with customer and admin routes

## Technology

- Frontend: React, Vite, Redux Toolkit, React Router, Tailwind CSS, Stripe.js
- Backend: Flask, Flask-SQLAlchemy, Flask-JWT-Extended, SQLite for local development
- Payments: Stripe and Safaricom Daraja M-Pesa (both use environment-supplied test/live credentials)

## Run locally

Prerequisites: Node.js 20+ and Python 3.11+.

```bash
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
cd backend && .venv/bin/python seed.py
cd .. && npm --prefix Frontend ci
```

Start the API in one terminal:

```bash
cd backend
.venv/bin/flask --app vetty_api run --debug --port 5000
```

Start the client in another:

```bash
cd Frontend
npm run dev
```

`npm run dev` starts both the local Flask API and Vite. Keep that terminal open while using the app.

Or start both services together from `Frontend`:

```bash
npm run dev:full
```

If either default port is in use, pick unused ports for both services:

```bash
VETTY_API_PORT=5055 VETTY_FRONTEND_PORT=5188 npm run dev:full
```

The client sends requests to `/api`; Vite proxies those requests to `http://127.0.0.1:5000` locally. Start both commands above before signing in. Check the API with `http://127.0.0.1:5000/api/health`.

The API creates/upgrades its local SQLite schema automatically. Run the seed command once when you need the demo administrator and catalogue data.

Set `VITE_API_URL` to the deployed backend URL when the client and API are hosted separately, and set `CORS_ORIGINS` on the backend to the frontend origin. Never commit `.env` files or live payment credentials.

## Production deployment

Deploy the Flask backend as its own Vercel project from `backend/`; `app.py` is the WSGI entry point. Before deploying, configure these environment variables on the backend project:

```text
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/vetty
JWT_SECRET_KEY=<a-long-random-secret>
CORS_ORIGINS=https://your-frontend-domain.vercel.app
INITIAL_ADMIN_EMAIL=admin@your-domain.example
INITIAL_ADMIN_PASSWORD=<a-unique-12-plus-character-password>
INITIAL_ADMIN_USERNAME=vetty-admin
```

Deploy the frontend separately from the repository root and set its build-time `VITE_API_URL` to the backend deployment URL. This separation provides durable account storage; serverless local SQLite files are not suitable for production.

### PostgreSQL production checklist

1. Create a managed PostgreSQL database and copy its SQLAlchemy-compatible connection string, for example `postgresql+psycopg://USER:PASSWORD@HOST:5432/vetty`.
2. Set that value as `DATABASE_URL` in the Vercel backend project's **Production** environment. Also set a long `JWT_SECRET_KEY`, set `CORS_ORIGINS` to the exact frontend origin, and set `INITIAL_ADMIN_EMAIL` plus a unique `INITIAL_ADMIN_PASSWORD` of at least 12 characters.
3. Deploy the backend once. It creates the schema and provisions the initial administrator from those variables. The bootstrap only creates/promotes that account; it never resets an existing password.
4. Deploy the frontend with `VITE_API_URL` set to the backend origin (for example, `https://vetty-api.vercel.app`). Sign in at `/admin/login` using the initial admin email and password.
5. Alternatively, create the schema and optional demo data once from a trusted machine with the same connection string:

```bash
cd backend
DATABASE_URL='postgresql+psycopg://USER:PASSWORD@HOST:5432/vetty' .venv/bin/python seed.py
```

6. Change the demo administrator password before allowing access. Do not deploy with SQLite as the production database: a serverless filesystem is temporary and can lose accounts, bookings, orders, and payments.

The seed command creates a local administrator: `admin@vetty.co.ke` / `ChangeMe123!`. Change that password before any deployment.

## API summary

Public catalogue endpoints: `GET /api/products`, `GET /api/services`, `GET /api/zones`.

Authentication endpoints: `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`.

Authenticated customer endpoints: `POST|GET /api/orders`, `POST|GET /api/bookings`, `PATCH|DELETE /api/bookings/:id`, and protected payment endpoints under `/api/payments`.

Administrator-only mutations: `POST|PATCH|DELETE /api/products`, `POST|PATCH|DELETE /api/services`, and `POST|PATCH|DELETE /api/zones`. Send `Authorization: Bearer <JWT>` for every protected request.

For provider configuration and webhook details, see [backend/PAYMENTS.md](backend/PAYMENTS.md).

## Verification

```bash
cd Frontend && npm test -- --runInBand && npm run build
backend/.venv/bin/python -m pytest backend/tests -q
```

The backend suite covers password login, administrator-only catalogue changes, booking ownership, and mocked Stripe/M-Pesa payment flows.

## Security notes

Passwords are hashed with Werkzeug, tokens are signed with `JWT_SECRET_KEY`, and authorization is checked on the API—not merely in the interface. Order/payment ownership is enforced from the token identity. Stripe webhook signatures and the M-Pesa callback token are verified before a payment changes state.
