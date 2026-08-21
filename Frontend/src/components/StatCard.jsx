import React from "react";
import { C } from "../theme/colors";

export default function StatCard({ label, value, sub, subColor = C.success }) {
  return (
    <div className="flex-1 p-3.5 rounded-2xl" style={{ background: C.sectionBg }}>
      <p className="text-[11px]" style={{ color: C.gray }}>{label}</p>
      <p className="text-xl font-bold mt-0.5" style={{ color: C.maroon }}>{value}</p>
      <p className="text-[10px] mt-0.5" style={{ color: subColor }}>{sub}</p>
    </div>
  );
}
