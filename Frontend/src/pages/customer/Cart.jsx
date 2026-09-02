import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Check, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { setQty, removeFromCart, setSelected } from "../../store/slices/cartSlice";
import ScreenHeader from "../../components/ScreenHeader";
import ImgBox from "../../components/ImgBox";
import Btn from "../../components/Btn";
import BottomNav from "../../components/BottomNav";
import { C } from "../../theme/colors";

export default function Cart() {
  const cart = useSelector((s) => s.cart.items);
  const products = useSelector((s) => s.catalog.products);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const items = cart.map((c) => ({ ...c, product: products.find((p) => p.id === c.productId) })).filter((c) => c.product);
  const selectedItems = items.filter((c) => c.selected !== false);
  const subtotal = selectedItems.reduce((s, c) => s + c.product.price * c.qty, 0);

  return (
    <div className="h-full flex flex-col">
      <ScreenHeader title="My Cart" backTo="/products" />
      <div className="content-container flex-1 overflow-y-auto px-5 py-3">
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <ShoppingBag size={36} color={C.lightGray} />
            <p className="text-sm" style={{ color: C.gray }}>Your cart is empty.</p>
            <Btn onClick={() => navigate("/products")}>Browse products</Btn>
          </div>
        )}
        <div className="flex flex-col gap-3">
          {items.map((c) => (
            <div key={c.productId} className="flex items-center gap-3">
              <button type="button" aria-label={`${c.selected !== false ? "Remove" : "Add"} ${c.product.name} from payment`} onClick={() => dispatch(setSelected({ id: c.productId, selected: c.selected === false }))} className="h-5 w-5 shrink-0 rounded-md flex items-center justify-center" style={{ background: c.selected !== false ? C.maroon : "transparent", border: `1px solid ${c.selected !== false ? C.maroon : C.lightGray}` }}>
                {c.selected !== false && <Check size={13} color="#fff" />}
              </button>
              <ImgBox h={64} r={12} icon={c.product.icon} name={c.product.name} className="w-16" />
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: C.charcoal }}>{c.product.name}</p>
                <p className="text-sm font-bold" style={{ color: C.maroon }}>KSh {c.product.price.toLocaleString()}</p>
                <div className="flex items-center gap-3 mt-1 px-2.5 py-1 rounded-lg w-fit" style={{ background: C.sectionBg }}>
                  <button onClick={() => dispatch(setQty({ id: c.productId, delta: -1 }))}><Minus size={12} color={C.maroon} /></button>
                  <span className="text-xs font-semibold">{c.qty}</span>
                  <button onClick={() => dispatch(setQty({ id: c.productId, delta: 1 }))}><Plus size={12} color={C.maroon} /></button>
                </div>
              </div>
              <button onClick={() => dispatch(removeFromCart(c.productId))}><Trash2 size={16} color={C.danger} /></button>
            </div>
          ))}
        </div>
      </div>
      {items.length > 0 && (
        <div className="p-4 border-t flex flex-col gap-3" style={{ borderColor: C.lightGray }}>
          <div className="flex justify-between text-sm"><span style={{ color: C.gray }}>Selected subtotal ({selectedItems.length})</span><span className="font-semibold">KSh {subtotal.toLocaleString()}</span></div>
          <Btn full disabled={selectedItems.length === 0} onClick={() => navigate("/checkout")}>Proceed to Checkout</Btn>
        </div>
      )}
      <BottomNav />
    </div>
  );
}
