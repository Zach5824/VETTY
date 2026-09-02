import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { api } from "./lib/api";
import { hydrateCatalog } from "./store/slices/catalogSlice";
import { clearCart, hydrateCart } from "./store/slices/cartSlice";
import Layout from "./components/Layout";

import Splash from "./pages/customer/Splash";
import Login from "./pages/customer/Login";
import Register from "./pages/customer/Register";
import Home from "./pages/customer/Home";
import Products from "./pages/customer/Products";
import ProductDetail from "./pages/customer/ProductDetail";
import Cart from "./pages/customer/Cart";
import Services from "./pages/customer/Services";
import Booking from "./pages/customer/Booking";
import Checkout from "./pages/customer/Checkout";
import Payment from "./pages/customer/Payment";
import Confirmation from "./pages/customer/Confirmation";
import Tracking from "./pages/customer/Tracking";
import History from "./pages/customer/History";
import Review from "./pages/customer/Review";
import Profile from "./pages/customer/Profile";

import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminRequests from "./pages/admin/AdminRequests";
import AdminInventory from "./pages/admin/AdminInventory";
import AdminZones from "./pages/admin/AdminZones";

function RequireAdmin({ children }) {
  const auth = useSelector((state) => state.auth);

  return auth.loggedIn && auth.role === "admin"
    ? children
    : <Navigate to="/admin/login" replace />;
}

function RequireAuth({ children }) {
  const loggedIn = useSelector((state) => state.auth.loggedIn);
  return loggedIn ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);
  const cartItems = useSelector((state) => state.cart.items);
  const [cartTokenReady, setCartTokenReady] = useState(null);
  useEffect(() => {
    Promise.all([api("/api/products"), api("/api/services"), api("/api/zones")])
      .then(([products, services, zones]) => dispatch(hydrateCatalog({ products, services, zones })))
      .catch(() => {}); // Seed data keeps the interface usable before the API is started.
  }, [dispatch]);

  useEffect(() => {
    if (!auth.token || !auth.loggedIn || auth.role !== "customer") {
      setCartTokenReady(null);
      return;
    }
    let active = true;
    setCartTokenReady(null);
    dispatch(clearCart());
    api("/api/cart", { token: auth.token })
      .then(({ items }) => { if (active) { dispatch(hydrateCart(items)); setCartTokenReady(auth.token); } })
      .catch(() => { if (active) setCartTokenReady(auth.token); });
    return () => { active = false; };
  }, [auth.token, auth.loggedIn, auth.role, dispatch]);

  useEffect(() => {
    if (!auth.token || auth.role !== "customer" || cartTokenReady !== auth.token) return;
    const timer = window.setTimeout(() => {
      api("/api/cart", { method: "PUT", token: auth.token, body: JSON.stringify({ items: cartItems }) }).catch(() => {});
    }, 400);
    return () => window.clearTimeout(timer);
  }, [auth.token, auth.role, cartItems, cartTokenReady]);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Splash />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/services" element={<Services />} />
        <Route path="/booking/:serviceId" element={<RequireAuth><Booking /></RequireAuth>} />
        <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
        <Route path="/payment" element={<RequireAuth><Payment /></RequireAuth>} />
        <Route path="/confirmation" element={<RequireAuth><Confirmation /></RequireAuth>} />
        <Route path="/tracking" element={<RequireAuth><Tracking /></RequireAuth>} />
        <Route path="/tracking/:orderId" element={<RequireAuth><Tracking /></RequireAuth>} />
        <Route path="/history" element={<RequireAuth><History /></RequireAuth>} />
        <Route path="/review/:orderId" element={<RequireAuth><Review /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />

        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        <Route path="/admin/products" element={<RequireAdmin><AdminProducts /></RequireAdmin>} />
        <Route path="/admin/requests" element={<RequireAdmin><AdminRequests /></RequireAdmin>} />
        <Route path="/admin/inventory" element={<RequireAdmin><AdminInventory /></RequireAdmin>} />
        <Route path="/admin/zones" element={<RequireAdmin><AdminZones /></RequireAdmin>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
