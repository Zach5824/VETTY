import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { login } from "../../store/slices/authSlice";
import Btn from "../../components/Btn";
import Field from "../../components/Field";
import ScreenHeader from "../../components/ScreenHeader";
import { api } from "../../lib/api";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const submit = async (e) => {
    e.preventDefault();
    const username = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (username.length < 2) return setError("Enter your name (at least 2 characters).");
    if (!normalizedEmail.includes("@")) return setError("Enter a valid email address.");
    if (pw.length < 8) return setError("Your password must be at least 8 characters.");
    try {
      setError(""); setIsSubmitting(true);
      const { user, access_token } = await api("/api/auth/signup", { method: "POST", body: JSON.stringify({ username, email: normalizedEmail, password: pw, phone: phone.trim() }) });
      dispatch(login({ role: user.role, name: user.username, email: user.email, token: access_token }));
      navigate("/home");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <ScreenHeader title="Create account" backTo="/login" />
      <form onSubmit={submit} className="content-container flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3 max-w-2xl">
        <Field label="Full name" value={name} onChange={setName} placeholder="Jane Wanjiku" required />
        <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="you@email.com" required />
        <Field label="Phone number" value={phone} onChange={setPhone} placeholder="+254 7xx xxx xxx" />
        <Field label="Password" value={pw} onChange={setPw} type="password" placeholder="At least 8 characters" required />
        <div className="mt-2">
          <Btn full type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating account…" : "Create account"}</Btn>
          {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      </form>
    </div>
  );
}
