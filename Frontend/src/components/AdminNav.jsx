import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BarChart3, ShoppingBag, CheckCircle2, Package, MapPin } from "lucide-react";
import { C } from "../theme/colors";

const items = [
  ["/admin/dashboard", BarChart3, "Dashboard"],
  ["/admin/products", ShoppingBag, "Catalog"],
  ["/admin/requests", CheckCircle2, "Requests"],
  ["/admin/inventory", Package, "Inventory"],
  ["/admin/zones", MapPin, "Zones"],
];

export default function AdminNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <div className="flex items-stretch justify-around sm:justify-center sm:gap-8 px-1 pt-2 pb-[calc(1.25rem+env(safe-area-inset-bottom))] border-t shrink-0" style={{ borderColor: C.lightGray, background: "#fff" }}>
      {items.map(([path, Icon, label]) => {
        const active = pathname === path;
        return (
          <button key={path} onClick={() => navigate(path)} className="flex flex-col items-center gap-1 px-1.5 py-1">
            <Icon size={18} color={active ? C.maroon : C.gray} />
            <span className="text-[9px] font-medium" style={{ color: active ? C.maroon : C.gray }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
