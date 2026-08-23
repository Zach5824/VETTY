import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { LogOut, Plus, Edit2, Trash2 } from "lucide-react";
import { logout } from "../../store/slices/authSlice";
import { addProduct, updateProduct, deleteProduct, addService, deleteService } from "../../store/slices/catalogSlice";
import Field from "../../components/Field";
import Btn from "../../components/Btn";
import ImgBox from "../../components/ImgBox";
import AdminNav from "../../components/AdminNav";
import { C } from "../../theme/colors";

export default function AdminProducts() {
  const products = useSelector((s) => s.catalog.products);
  const services = useSelector((s) => s.catalog.services);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", stock: "", category: "Food", icon: "Package", desc: "", threshold: "10" });

  const submit = () => {
    if (!form.name || !form.price) return;
    dispatch(addProduct({
      name: form.name, price: Number(form.price), stock: Number(form.stock || 0),
      category: form.category, icon: form.icon, desc: form.desc, threshold: Number(form.threshold),
    }));
    setForm({ name: "", price: "", stock: "", category: "Food", icon: "Package", desc: "", threshold: "10" });
    setShowForm(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-5 h-16 shrink-0" style={{ background: C.maroon }}>
        <h1 className="text-base font-bold text-white">Manage Products</h1>
        <button onClick={() => { dispatch(logout()); navigate("/"); }}><LogOut size={17} color="#fff" /></button>
      </div>
      <div className="content-container flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: C.gray }}>{products.length} products</p>
          <Btn small onClick={() => setShowForm((v) => !v)} icon={Plus}>{showForm ? "Close" : "Add Product"}</Btn>
        </div>
        {showForm && (
          <div className="p-4 rounded-2xl flex flex-col gap-3" style={{ border: `1px solid ${C.lightGray}` }}>
            <Field label="Product name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Fish Pellets 500g" />
            <div className="flex flex-col sm:flex-row gap-2">
              <Field label="Price (KSh)" value={form.price} onChange={(v) => setForm({ ...form, price: v })} placeholder="450" />
              <Field label="Stock qty" value={form.stock} onChange={(v) => setForm({ ...form, stock: v })} placeholder="120" />
            </div>
            <Field label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
            <Field label="Description" value={form.desc} onChange={(v) => setForm({ ...form, desc: v })} placeholder="Short description…" />
            <Btn full onClick={submit}>Save Product</Btn>
          </div>
        )}
        {products.map((p) => (
          <div key={p.id} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: C.sectionBg }}>
            <ImgBox h={48} r={12} icon={p.icon} className="w-12" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: C.charcoal }}>{p.name}</p>
              <p className="text-xs font-bold" style={{ color: C.maroon }}>KSh {p.price.toLocaleString()}</p>
              <p className="text-[10px] font-medium" style={{ color: p.stock === 0 ? C.danger : p.stock <= p.threshold ? C.warning : C.success }}>
                {p.stock === 0 ? "Out of stock" : `Stock: ${p.stock}${p.stock <= p.threshold ? " (low)" : ""}`}
              </p>
            </div>
            <button onClick={() => dispatch(updateProduct({ id: p.id, patch: { stock: p.stock + 20 } }))} title="Restock +20"><Edit2 size={15} color={C.charcoal} /></button>
            <button onClick={() => dispatch(deleteProduct(p.id))}><Trash2 size={15} color={C.danger} /></button>
          </div>
        ))}

        <p className="text-sm font-semibold mt-2" style={{ color: C.charcoal }}>Services</p>
        {services.map((s) => (
          <div key={s.id} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: C.sectionBg }}>
            <ImgBox h={48} r={12} icon={s.icon} className="w-12" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: C.charcoal }}>{s.name}</p>
              <p className="text-xs font-bold" style={{ color: C.maroon }}>KSh {s.price.toLocaleString()} · {s.duration}</p>
            </div>
            <button onClick={() => dispatch(deleteService(s.id))}><Trash2 size={15} color={C.danger} /></button>
          </div>
        ))}
        <Btn full variant="ghost" icon={Plus} onClick={() => dispatch(addService({ name: "New Service", price: 1000, duration: "30 min", icon: "Stethoscope", desc: "Describe this service" }))}>
          Add Service
        </Btn>
      </div>
      <AdminNav />
    </div>
  );
}
