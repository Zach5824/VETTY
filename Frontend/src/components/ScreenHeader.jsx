import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { C, GRADIENT, sans } from "../theme/colors";

export default function ScreenHeader({ title, dark, right, backTo }) {
  const navigate = useNavigate();
  const onBack = () => (backTo ? navigate(backTo) : navigate(-1));
  return (
    <div className="flex items-center justify-between px-4 h-14 shrink-0" style={dark ? { background: GRADIENT } : {}}>
      <button onClick={onBack} className="p-1 -ml-1" style={{ color: dark ? "#fff" : C.charcoal }}>
        <ChevronLeft size={22} />
      </button>
      <h1 className="text-[15px] font-semibold truncate" style={{ color: dark ? "#fff" : C.charcoal, fontFamily: sans }}>{title}</h1>
      <div className="w-6">{right}</div>
    </div>
  );
}
