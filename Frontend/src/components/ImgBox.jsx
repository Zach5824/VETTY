import React from "react";
import { Bone, Fish, MapPinned, Package, PawPrint, Scissors, Smile, Stethoscope, Syringe, Utensils, Waves } from "lucide-react";
import { C } from "../theme/colors";

const icons = { Bone, Fish, MapPinned, Package, PawPrint, Scissors, Smile, Stethoscope, Syringe, Utensils, Waves };

export default function ImgBox({ h = 120, r = 12, icon = "PawPrint", className = "" }) {
  const Icon = icons[icon] || Package;
  return (
    <div
      className={`flex items-center justify-center shrink-0 ${className}`}
      style={{ height: h, borderRadius: r, background: `linear-gradient(145deg, ${C.sectionBg}, #DCEFF9)` }}
    >
      <Icon size={h > 80 ? 40 : 24} strokeWidth={1.6} color={C.maroon} aria-hidden="true" />
    </div>
  );
}
