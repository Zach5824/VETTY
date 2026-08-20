import React from "react";
import { C } from "../theme/colors";

export default function Btn({ children, onClick, variant = "primary", full, small, icon: Icon, disabled, type = "button" }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed";
  const size = small ? "px-4 py-2 text-xs" : "px-6 py-3.5 text-sm";
  const styles = {
    primary: { background: C.gold, color: C.maroonDark },
    dark: { background: C.maroon, color: "#fff" },
    outline: { background: "transparent", color: C.maroon, border: `1.5px solid ${C.maroon}` },
    outlineLight: { background: "transparent", color: "#fff", border: "1.5px solid #ffffff" },
    ghost: { background: C.sectionBg, color: C.charcoal },
    success: { background: C.success, color: "#fff" },
    danger: { background: C.danger, color: "#fff" },
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${size} ${full ? "w-full" : ""} ${variant === "primary" || variant === "dark" ? "shadow-sm" : ""}`}
      style={styles[variant]}
    >
      {Icon && <Icon size={small ? 14 : 16} />}
      {children}
    </button>
  );
}
