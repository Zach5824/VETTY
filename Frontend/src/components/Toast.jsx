import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearToast } from "../store/slices/uiSlice";
import { C } from "../theme/colors";

export default function Toast() {
  const msg = useSelector((s) => s.ui.toast);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => dispatch(clearToast()), 1800);
    return () => clearTimeout(t);
  }, [msg, dispatch]);

  if (!msg) return null;
  return (
    <div
      className="fixed sm:absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs font-semibold shadow-lg z-50"
      style={{ background: C.charcoal, color: "#fff" }}
    >
      {msg}
    </div>
  );
}
