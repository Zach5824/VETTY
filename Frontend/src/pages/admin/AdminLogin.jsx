import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { ShieldCheck } from "lucide-react";
import { login } from "../../store/slices/authSlice";
import Field from "../../components/Field";
import Btn from "../../components/Btn";
import { GRADIENT, C, serif } from "../../theme/colors";
import { api } from "../../lib/api";

export default function AdminLogin() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@vetty.co.ke");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const { user, access_token } = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      if (user.role !== "admin") throw new Error("This account is not an administrator.");
      dispatch(login({ role: user.role, name: user.username, email: user.email, token: access_token }));
      navigate("/admin/dashboard");
    } catch (requestError) { setError(requestError.message); }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center px-8 text-center" style={{ background: GRADIENT }}>
      <h1 className="text-2xl font-bold text-white" style={{ fontFamily: serif }}>Vetty Admin</h1>
      <p className="text-xs mt-2 mb-6" style={{ color: "#fff", opacity: 0.85 }}>Sign in to manage products, services, orders & reports.</p>
      <form onSubmit={submit} className="w-full max-w-xl rounded-3xl p-6 bg-white">
        <div className="flex flex-col gap-3">
          <Field label="Admin email" value={email} onChange={setEmail} type="email" placeholder="admin@vetty.co.ke" required />
          <Field label="Password" value={password} onChange={setPassword} type="password" placeholder="••••••••" required />
          <Btn full type="submit">Secure Login</Btn>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <p className="text-[10px] text-center flex items-center justify-center gap-1" style={{ color: C.gray }}><ShieldCheck size={11} /> Two-factor authentication enabled</p>
        </div>
      </form>
      <button className="mt-6 text-[11px] underline" style={{ color: "rgba(255,255,255,0.7)" }} onClick={() => navigate("/")}>
        Back to customer app
      </button>
    </div>
  );
}
