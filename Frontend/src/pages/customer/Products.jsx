import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Search, Plus } from "lucide-react";
import { addToCart } from "../../store/slices/cartSlice";
import { showToast } from "../../store/slices/uiSlice";
import ScreenHeader from "../../components/ScreenHeader";
import ImgBox from "../../components/ImgBox";
import BottomNav from "../../components/BottomNav";
import { C } from "../../theme/colors";

const CATS = ["All", "Food", "Toys", "Medicine", "Accessories"];

export default function Products() {
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const products = useSelector((s) => s.catalog.products);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const list = products.filter((p) => (cat === "All" || p.category === cat) && p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="h-full flex flex-col">
      <ScreenHeader title="Shop" backTo="/home" />
      <div className="content-container px-5 pt-2 pb-3 shrink-0">
        <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: C.sectionBg }}>
          <Search size={15} color={C.gray} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search food, toys, meds…" className="bg-transparent outline-none text-sm flex-1" style={{ color: C.charcoal }} />
        </div>
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {CATS.map((c) => (
            <button key={c} onClick={() => setCat(c)} className="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap" style={{ background: cat === c ? C.maroon : C.sectionBg, color: cat === c ? "#fff" : C.charcoal }}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="content-container flex-1 overflow-y-auto px-5 pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {list.map((p) => (
            <div key={p.id} className="rounded-2xl overflow-hidden bg-white" style={{ border: `1px solid ${C.lightGray}` }}>
              <button className="w-full text-left" onClick={() => navigate(`/products/${p.id}`)}>
                <ImgBox h={92} r={0} icon={p.icon} />
                <div className="p-3">
                  <p className="text-xs font-semibold line-clamp-2" style={{ color: C.charcoal }}>{p.name}</p>
                  {p.stock === 0 && <p className="text-[10px] font-semibold mt-1" style={{ color: C.danger }}>Out of stock</p>}
                </div>
              </button>
              <div className="flex items-center justify-between px-3 pb-3">
                <span className="text-sm font-bold" style={{ color: C.maroon }}>KSh {p.price.toLocaleString()}</span>
                <button
                  disabled={p.stock === 0}
                  onClick={() => { dispatch(addToCart({ id: p.id, qty: 1 })); dispatch(showToast("Added to cart")); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-30"
                  style={{ background: C.gold }}
                >
                  <Plus size={14} color={C.maroonDark} />
                </button>
              </div>
            </div>
          ))}
          {list.length === 0 && <p className="col-span-full text-center text-sm py-10" style={{ color: C.gray }}>No products match your search.</p>}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
