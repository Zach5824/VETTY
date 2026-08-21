import React from "react";
import { C } from "../theme/colors";

export default function Field({ label, value, onChange, placeholder = "", type = "text" }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold mb-1" style={{ color: C.charcoal }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl px-4 py-3 text-sm outline-none"
        style={{ background: C.sectionBg, color: C.charcoal }}
      />
    </label>
  );
}
