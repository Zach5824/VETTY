import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { FileDown } from "lucide-react";
import { logout } from "../../store/slices/authSlice";
import { addZone } from "../../store/slices/catalogSlice";
import Field from "../../components/Field";
import Btn from "../../components/Btn";
import StatCard from "../../components/StatCard";
import AdminNav from "../../components/AdminNav";
import { C, serif } from "../../theme/colors";

export default function AdminZones() {
  const zones = useSelector((s) => s.catalog.zones);
  const orders = useSelector((s) => s.orders.orders);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", fee: "", eta: "" });

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const avgOrder = Math.round(totalRevenue / (orders.length || 1));

  const submit = () => {
    if (!form.name) return;
    dispatch(addZone({ name: form.name, fee: Number(form.fee || 0), eta: form.eta || "—" }));
    setForm({ name: "", fee: "", eta: "" });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <div className="flex items-center justify-between px-5 h-16 shrink-0" style={{ background: C.maroon }}>
        <h1 className="text-base font-bold text-white">Zones & Reports</h1>
        <button onClick={() => { dispatch(logout()); navigate("/"); }}><LogOut size={17} color="#fff" /></button>
      </div>
      <div className="content-container flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        <p className="text-sm font-bold" style={{ fontFamily: serif, color: C.maroon }}>Delivery zones & pricing</p>
        {zones.map((z) => (
          <div key={z.id} className="p-3 rounded-xl flex justify-between items-center" style={{ background: C.sectionBg }}>
            <div>
              <p className="text-xs font-semibold" style={{ color: C.charcoal }}>{z.name}</p>
              <p className="text-[10px]" style={{ color: C.gray }}>Est. delivery: {z.eta}</p>
            </div>
            <p className="text-sm font-bold" style={{ color: C.maroon }}>KSh {z.fee}</p>
          </div>
        ))}
        <div className="p-3 rounded-xl flex flex-col gap-2" style={{ border: `1px dashed ${C.lightGray}` }}>
          <Field label="Zone name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Zone D — Runda" />
          <div className="flex flex-col sm:flex-row gap-2">
            <Field label="Fee (KSh)" value={form.fee} onChange={(v) => setForm({ ...form, fee: v })} placeholder="350" />
            <Field label="ETA" value={form.eta} onChange={(v) => setForm({ ...form, eta: v })} placeholder="30-40 min" />
          </div>
          <Btn full variant="outline" onClick={submit}>+ Add Delivery Zone</Btn>
        </div>

        <p className="text-sm font-bold mt-2" style={{ fontFamily: serif, color: C.maroon }}>Sales reports & analytics</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <StatCard label="Total revenue" value={`KSh ${totalRevenue.toLocaleString()}`} sub="All-time" />
          <StatCard label="Avg. order value" value={`KSh ${avgOrder.toLocaleString()}`} sub="Per order" />
        </div>
        <Btn full icon={FileDown}>Export Full Report (PDF/CSV)</Btn>
      </div>
      <AdminNav />
    </div>
  );
}
