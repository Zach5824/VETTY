import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ShoppingBag } from "lucide-react";
import { C } from "../theme/colors";

export default function CartButton() {
  const navigate = useNavigate();
  const itemCount = useSelector((state) => state.cart.items.length);

  return (
    <button
      type="button"
      aria-label={`Open cart${itemCount ? `, ${itemCount} item${itemCount === 1 ? "" : "s"}` : ""}`}
      onClick={() => navigate("/cart")}
      className="fixed right-5 bottom-24 z-30 w-12 h-12 rounded-full shadow-lg flex items-center justify-center"
      style={{ background: C.gold, color: C.maroonDark }}
    >
      <ShoppingBag size={21} />
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: C.maroonDark }}>
          {itemCount}
        </span>
      )}
    </button>
  );
}
