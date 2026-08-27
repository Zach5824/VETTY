import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { ChevronLeft, Star, Minus, Plus } from "lucide-react";
import { addToCart } from "../../store/slices/cartSlice";
import ImgBox from "../../components/ImgBox";
import Btn from "../../components/Btn";
import { C, serif } from "../../theme/colors";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const product = useSelector((s) => s.catalog.products.find((p) => p.id === id));
  const [qty, setQty] = useState(1);

  if (!product) return <div className="p-6 text-sm">Product not found.</div>;

  return (
    <div className="h-full flex flex-col">
      <div className="overflow-y-auto flex-1">
        <div className="relative">
          <ImgBox h={260} r={0} icon={product.icon} name={product.name} />
          <button onClick={() => navigate(-1)} className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.9)" }}>
            <ChevronLeft size={18} color={C.charcoal} />
          </button>
        </div>
        <div className="content-container px-5 pt-5 pb-4 flex flex-col gap-3">
          <h2 className="text-xl font-bold" style={{ fontFamily: serif, color: C.maroon }}>{product.name}</h2>
          <div className="flex items-center gap-2 text-xs" style={{ color: C.charcoal }}>
            <Star size={13} fill={C.gold} color={C.gold} /> 4.8 <span style={{ color: C.gray }}>(212 reviews)</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: C.maroon }}>KSh {product.price.toLocaleString()}</p>
          <p className="text-sm leading-relaxed" style={{ color: C.gray }}>{product.desc}</p>
          <p className="text-xs font-semibold" style={{ color: product.stock === 0 ? C.danger : C.success }}>
            {product.stock === 0 ? "Out of stock" : `${product.stock} in stock`}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-semibold" style={{ color: C.charcoal }}>Quantity</span>
            <div className="flex items-center gap-4 px-3 py-2 rounded-xl" style={{ background: C.sectionBg }}>
              <button onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus size={14} color={C.maroon} /></button>
              <span className="text-sm font-semibold w-4 text-center">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)}><Plus size={14} color={C.maroon} /></button>
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 border-t" style={{ borderColor: C.lightGray }}>
        <Btn
          full
          disabled={product.stock === 0}
          onClick={() => { dispatch(addToCart({ id: product.id, qty })); navigate("/cart"); }}
        >
          Add to Cart — KSh {(product.price * qty).toLocaleString()}
        </Btn>
      </div>
    </div>
  );
}
