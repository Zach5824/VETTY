import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { LogOut, AlertTriangle, CheckCircle2 } from "lucide-react";
import { logout } from "../../store/slices/authSlice";
import { setThreshold } from "../../store/slices/catalogSlice";
import AdminNav from "../../components/AdminNav";
import { C } from "../../theme/colors";

export default function AdminInventory() {
  const products = useSelector((s) => s.catalog.products);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [edits, setEdits] = useState({});

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-5 h-16 shrink-0" style={{ background: C.maroon }}>
        <h1 className="text-base font-bold text-white">Inventory</h1>
        <button onClick={() => { dispatch(logout()); navigate("/"); }}><LogOut size={17} color="#fff" /></button>
      </div>
      <div className="content-container flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "#FFF3CD" }}>
          <AlertTriangle size={16} color={C.warning} />
          <p className="text-xs font-semibold" style={{ color: C.charcoal }}>
            {products.filter((p) => p.stock <= p.threshold).length} products are below their low-stock threshold
          </p>
        </div>
        {products.map((p) => (
          <div key={p.id} className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: C.lightGray }}>
            <div className="min-w-0 pr-3">
              <p className="text-xs font-semibold truncate" style={{ color: C.charcoal }}>{p.name}</p>
              <p className="text-[10px]" style={{ color: p.stock === 0 ? C.danger : p.stock <= p.threshold ? C.warning : C.success }}>
                {p.stock === 0 ? "Out of stock" : p.stock <= p.threshold ? `Below threshold (${p.threshold})` : "Healthy stock"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={edits[p.id] ?? p.threshold}
                onChange={(e) => setEdits({ ...edits, [p.id]: e.target.value })}
                className="w-14 text-xs text-center rounded-lg py-1.5"
                style={{ background: C.sectionBg }}
              />
              <button onClick={() => dispatch(setThreshold({ id: p.id, value: Number(edits[p.id] ?? p.threshold) }))}>
                <CheckCircle2 size={16} color={C.success} />
              </button>
              <p className="text-sm font-bold w-10 text-right" style={{ color: C.charcoal }}>{p.stock}</p>
            </div>
          </div>
        ))}
      </div>
      <AdminNav />
    </div>
  );
}
