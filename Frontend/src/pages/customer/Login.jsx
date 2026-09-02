import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { login } from "../../store/slices/authSlice";
import Btn from "../../components/Btn";
import Field from "../../components/Field";
import { C, GRADIENT, serif } from "../../theme/colors";
import { api } from "../../lib/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const submit = async (e) => {
    e.preventDefault();
    try {
      setError(""); setIsSubmitting(true);
      const { user, access_token } = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email: email.trim().toLowerCase(), password: pw }) });
      if (user.role === "admin") {
        throw new Error("Please use Admin sign in from the loading page.");
      }
      dispatch(login({ role: user.role, name: user.username, email: user.email, token: access_token, profilePhoto: user.profile_photo }));
      navigate("/home");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="h-40 shrink-0" style={{ background: GRADIENT }} />
      <div className="flex-1 px-6 -mt-16 flex flex-col gap-4 pb-6">
        <form onSubmit={submit} className="w-full max-w-xl mx-auto rounded-3xl p-6 shadow-lg bg-white">
          <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: serif, color: C.maroon }}>Welcome back</h2>
          <p className="text-xs mb-5" style={{ color: C.gray }}>Login to manage your pet's food, health & bookings.</p>
          <div className="flex flex-col gap-3">
            <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="you@email.com" required />
            <Field label="Password" value={pw} onChange={setPw} type="password" placeholder="••••••••" required />
            <Btn full type="submit" disabled={isSubmitting}>{isSubmitting ? "Logging in…" : "Login"}</Btn>
            {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
            <button type="button" className="text-xs font-semibold text-center" style={{ color: C.rose }} onClick={() => navigate("/register")}>
              New to Vetty? Create an account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
