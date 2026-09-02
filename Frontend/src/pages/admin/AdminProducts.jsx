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
import { api } from "../../lib/api";

export default function AdminProducts() {
  const products = useSelector((s) => s.catalog.products);
  const services = useSelector((s) => s.catalog.services);
  const auth = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", stock: "", category: "Food", icon: "Package", desc: "", threshold: "10" });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async () => {
    if (!form.name || !form.price) return;
    try {
      setError(""); setIsSaving(true);
      const product = await api("/api/products", { method: "POST", token: auth.token, body: JSON.stringify({
        name: form.name.trim(), price: Number(form.price), stock: Number(form.stock || 0),
        category: form.category.trim(), icon: form.icon, desc: form.desc, threshold: Number(form.threshold),
      }) });
      dispatch(addProduct(product));
      setForm({ name: "", price: "", stock: "", category: "Food", icon: "Package", desc: "", threshold: "10" });
      setShowForm(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  };

  const restock = async (product) => {
    try {
      setError("");
      const updated = await api(`/api/products/${product.id}`, { method: "PATCH", token: auth.token, body: JSON.stringify({ stock: product.stock + 20 }) });
      dispatch(updateProduct({ id: updated.id, patch: updated }));
    } catch (requestError) { setError(requestError.message); }
  };

  const removeProduct = async (id) => {
    try {
      setError("");
      await api(`/api/products/${id}`, { method: "DELETE", token: auth.token });
      dispatch(deleteProduct(id));
    } catch (requestError) { setError(requestError.message); }
  };

  const createService = async () => {
    try {
      setError("");
      const service = await api("/api/services", { method: "POST", token: auth.token, body: JSON.stringify({ name: "New Service", price: 1000, duration: "30 min", icon: "Stethoscope", desc: "Describe this service" }) });
      dispatch(addService(service));
    } catch (requestError) { setError(requestError.message); }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col">
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
            <Btn full disabled={isSaving} onClick={submit}>{isSaving ? "Saving…" : "Save Product"}</Btn>
          </div>
        )}
        {error && <p role="alert" className="text-xs" style={{ color: C.danger }}>{error}</p>}
        {products.map((p) => (
          <div key={p.id} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: C.sectionBg }}>
            <ImgBox h={48} r={12} icon={p.icon} name={p.name} className="w-12" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: C.charcoal }}>{p.name}</p>
              <p className="text-xs font-bold" style={{ color: C.maroon }}>KSh {p.price.toLocaleString()}</p>
              <p className="text-[10px] font-medium" style={{ color: p.stock === 0 ? C.danger : p.stock <= p.threshold ? C.warning : C.success }}>
                {p.stock === 0 ? "Out of stock" : `Stock: ${p.stock}${p.stock <= p.threshold ? " (low)" : ""}`}
              </p>
            </div>
            <button onClick={() => restock(p)} title="Restock +20"><Edit2 size={15} color={C.charcoal} /></button>
            <button onClick={() => removeProduct(p.id)}><Trash2 size={15} color={C.danger} /></button>
          </div>
        ))}

        <p className="text-sm font-semibold mt-2" style={{ color: C.charcoal }}>Services</p>
        {services.map((s) => (
          <div key={s.id} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: C.sectionBg }}>
            <ImgBox h={48} r={12} icon={s.icon} name={s.name} className="w-12" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: C.charcoal }}>{s.name}</p>
              <p className="text-xs font-bold" style={{ color: C.maroon }}>KSh {s.price.toLocaleString()} · {s.duration}</p>
            </div>
            <button onClick={() => dispatch(deleteService(s.id))}><Trash2 size={15} color={C.danger} /></button>
          </div>
        ))}
        <Btn full variant="ghost" icon={Plus} onClick={createService}>
          Add Service
        </Btn>
      </div>
      <AdminNav />
    </div>
  );
}
