import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
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

export default function App() {
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
        <Route path="/booking/:serviceId" element={<Booking />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/confirmation" element={<Confirmation />} />
        <Route path="/tracking" element={<Tracking />} />
        <Route path="/tracking/:orderId" element={<Tracking />} />
        <Route path="/history" element={<History />} />
        <Route path="/review/:orderId" element={<Review />} />
        <Route path="/profile" element={<Profile />} />

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
