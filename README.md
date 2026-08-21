# Vetty — Frontend

React + Redux Toolkit frontend for **Vetty**, a pet-care e-commerce & veterinary
services app (Nairobi). Matches the Figma design system: deep maroon/burgundy
(`#800020`) hero surfaces, vibrant gold (`#FFC107`) CTAs, off-white content
cards, pill-shaped buttons.

## Stack

- **React 18** + **Vite** — app shell & dev server
- **Redux Toolkit** — global state (`src/store`), one slice per domain
- **React Router v6** — client-side routing (`src/App.jsx`)
- **Tailwind CSS** — layout/spacing utilities (colors are driven by `src/theme/colors.js`
  and mirrored in `tailwind.config.js` if you prefer Tailwind color classes)
- **lucide-react** — icon set

This is the frontend only. It's built to be dropped in front of the Flask +
PostgreSQL backend described in the project brief — see "Connecting a real
backend" below.

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build to /dist
npm run preview   # preview the production build
```

## Project structure

```
src/
  main.jsx              # app entry (Provider + BrowserRouter)
  App.jsx                # all routes
  index.css               # Tailwind entry + global styles
  theme/colors.js         # design tokens (palette, gradient, fonts)
  data/seed.js             # mock seed data (swap for API calls)
  store/
    store.js               # configureStore
    slices/
      authSlice.js          # login/logout, role: 'customer' | 'admin'
      catalogSlice.js        # products, services, delivery zones (admin CRUD)
      cartSlice.js            # cart items
      ordersSlice.js           # orders, bookings, reviews, approvals
      checkoutSlice.js          # delivery zone + payment method selection
      uiSlice.js                 # toast notifications
  components/             # shared UI: Btn, Field, Badge, ImgBox, ScreenHeader,
                            # BottomNav, AdminNav, StatCard, Toast, Layout
  pages/
    customer/              # Splash, Login, Register, Home, Products,
                             # ProductDetail, Cart, Services, Booking,
                             # Checkout, Payment, Confirmation, Tracking,
                             # History, Review, Profile
    admin/                  # AdminLogin, AdminDashboard, AdminProducts,
                             # AdminRequests, AdminInventory, AdminZones
```

## User stories covered

**Admin:** secure login, add/edit/delete products & services, approve/reject
product orders and service requests, inventory + low-stock thresholds,
delivery zones & pricing, sales dashboard/reports.

**Customer:** register/login, browse products & services, cart with quantity
selection, book services with date/time, checkout with delivery zone,
payment (M-Pesa / Stripe / Cash on Delivery — mocked), live order tracking,
order history, ratings & reviews.

## Connecting a real backend

Everything currently runs on in-memory Redux state seeded from
`src/data/seed.js`, so you can click through the whole app with no backend.
To wire it to the real Flask/PostgreSQL API:

1. Add an API client (e.g. `src/api/client.js` using `fetch` or `axios`) pointed
   at your Flask base URL.
2. Replace the seed imports in each slice with `createAsyncThunk` calls that
   hit your endpoints, and add `extraReducers` for the pending/fulfilled/rejected
   states. The action names (`addProduct`, `placeOrder`, `approveOrder`, …)
   are already shaped to match typical REST resources.
3. Swap the mock `login`/`logout` actions for real auth (JWT or session
   cookie), and gate `/admin/*` routes behind the returned role.
4. Replace the "Pay Securely" button in `pages/customer/Payment.jsx` with real
   M-Pesa Daraja STK push / Stripe Elements calls, and only dispatch
   `placeOrder` after a successful payment callback.

## Testing

`npm test` runs Jest. A starter test is in `src/__tests__/cartSlice.test.js`
covering the cart reducer — add one file per slice/component as you build out
coverage. Pair with **Minitest** on the Flask side for backend unit tests, per
the project's technical spec.
