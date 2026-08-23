import React from "react";
import { Outlet } from "react-router-dom";
import Toast from "./Toast";

// A full-width application shell. Individual screens constrain their content
// where appropriate, while navigation and backgrounds can use the full canvas.
export default function Layout() {
  return (
    <div className="app-shell w-full min-h-[100dvh] bg-white">
      <div className="relative w-full min-h-[100dvh] overflow-hidden bg-white flex flex-col">
        <Outlet />
        <Toast />
      </div>
    </div>
  );
}
