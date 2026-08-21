import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, ShoppingBag, Stethoscope, Package, User } from "lucide-react";
import { C } from "../theme/colors";

const items = [
  ["/home", Home, "Home"],
  ["/products", ShoppingBag, "Shop"],
  ["/services", Stethoscope, "Services"],
  ["/history", Package, "Orders"],
  ["/profile", User, "Profile"],
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <div className="flex items-stretch justify-around sm:justify-center sm:gap-8 px-2 pt-2 pb-[calc(1.25rem+env(safe-area-inset-bottom))] border-t shrink-0" style={{ borderColor: C.lightGray, background: "#fff" }}>
      {items.map(([path, Icon, label]) => {
        const active = pathname === path;
        return (
          <button key={path} onClick={() => navigate(path)} className="flex flex-col items-center gap-1 px-2 py-1">
            <Icon size={19} color={active ? C.maroon : C.gray} />
            <span className="text-[10px] font-medium" style={{ color: active ? C.maroon : C.gray }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
