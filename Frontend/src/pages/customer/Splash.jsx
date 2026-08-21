import React from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { login } from "../../store/slices/authSlice";
import Btn from "../../components/Btn";
import { C, GRADIENT, serif } from "../../theme/colors";

export default function Splash() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  return (
    <div className="h-full w-full flex flex-col items-center justify-center text-center px-8" style={{ background: GRADIENT }}>
      <h1 className="text-4xl font-bold text-white" style={{ fontFamily: serif }}>Vetty<span style={{ color: C.gold }}>.</span></h1>
      <p className="text-xs mt-2 tracking-wide" style={{ color: C.gold }}>NAIROBI'S TRUSTED PET SHOP</p>
      <div className="mt-10 w-full max-w-md flex flex-col sm:flex-row gap-3">
        <Btn full onClick={() => navigate("/login")}>Get started</Btn>
        <Btn full variant="outlineLight" onClick={() => { dispatch(login({ role: "customer", name: "Guest" })); navigate("/home"); }}>
          Continue as guest
        </Btn>
      </div>
      <button className="mt-8 text-[11px] underline" style={{ color: "rgba(255,255,255,0.7)" }} onClick={() => navigate("/admin/login")}>
        I'm a Vetty admin
      </button>
    </div>
  );
}
