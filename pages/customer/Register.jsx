import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { login } from "../../store/slices/authSlice";
import Btn from "../../components/Btn";
import Field from "../../components/Field";
import ScreenHeader from "../../components/ScreenHeader";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const submit = (e) => {
    e.preventDefault();
    dispatch(login({ role: "customer", name: name || "New User" }));
    navigate("/home");
  };

  return (
    <div className="h-full flex flex-col">
      <ScreenHeader title="Create account" backTo="/login" />
      <form onSubmit={submit} className="content-container flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3 max-w-2xl">
        <Field label="Full name" value={name} onChange={setName} placeholder="Jane Wanjiku" />
        <Field label="Email" value={email} onChange={setEmail} placeholder="you@email.com" />
        <Field label="Phone number" value={phone} onChange={setPhone} placeholder="+254 7xx xxx xxx" />
        <Field label="Password" value={pw} onChange={setPw} type="password" placeholder="••••••••" />
        <div className="mt-2">
          <Btn full type="submit">Create account</Btn>
        </div>
      </form>
    </div>
  );
}
