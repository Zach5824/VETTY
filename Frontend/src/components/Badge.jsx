import React from "react";
import { C } from "../theme/colors";

export default function Badge({ children, color = C.gold, fg = C.maroonDark }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: color, color: fg }}>
      {children}
    </span>
  );
}
