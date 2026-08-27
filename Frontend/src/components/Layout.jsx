import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Toast from "./Toast";
import CartButton from "./CartButton";

// A full-width application shell. Individual screens constrain their content
// where appropriate, while navigation and backgrounds can use the full canvas.
export default function Layout() {
  const { pathname } = useLocation();
  const isAdminRoute = pathname.startsWith("/admin") && pathname !== "/admin/login";
  // Keep the cart shortcut in the customer shopping experience only. In
  // particular, checkout/payment screens need their primary actions unobscured.
  const showCartButton = !isAdminRoute && (
    pathname === "/home" ||
    pathname === "/products" ||
    pathname.startsWith("/products/") ||
    pathname === "/services"
  );

  return (
    <div className="app-shell w-full min-h-[100dvh] bg-white">
      <div className="relative w-full min-h-[100dvh] overflow-hidden bg-white flex flex-col">
        <Outlet />
        {showCartButton && <CartButton />}
        <Toast />
      </div>
    </div>
  );
}
