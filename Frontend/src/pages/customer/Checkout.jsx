import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Home as HomeIcon } from "lucide-react";
import { setZone } from "../../store/slices/checkoutSlice";
import ScreenHeader from "../../components/ScreenHeader";
import Btn from "../../components/Btn";
import { C } from "../../theme/colors";

export default function Checkout() {
  const cart = useSelector((s) => s.cart.items);
  const products = useSelector((s) => s.catalog.products);
  const zones = useSelector((s) => s.catalog.zones);
  const zoneId = useSelector((s) => s.checkout.zoneId);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const items = cart.map((c) => ({ ...c, product: products.find((p) => p.id === c.productId) })).filter((c) => c.product);
  const subtotal = items.reduce((s, c) => s + c.product.price * c.qty, 0);
  const zone = zones.find((z) => z.id === zoneId) || zones[0];

  return (
    <div className="h-full flex flex-col">
      <ScreenHeader title="Checkout" backTo="/cart" />
      <div className="content-container flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-5">
        <div>
          <p className="text-sm font-semibold mb-2" style={{ color: C.charcoal }}>Delivery address</p>
          <div className="p-3 rounded-xl" style={{ border: `2px solid ${C.maroon}` }}>
            <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: C.maroon }}><HomeIcon size={14} /> Home</p>
            <p className="text-xs mt-1" style={{ color: C.gray }}>Ngong Road, Nairobi — Apt 4B · +254 712 345 678</p>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold mb-2" style={{ color: C.charcoal }}>Delivery zone</p>
          <div className="flex flex-col gap-2">
            {zones.map((z) => (
              <button key={z.id} onClick={() => dispatch(setZone(z.id))} className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: zoneId === z.id ? C.sectionBg : "transparent", border: `1px solid ${zoneId === z.id ? C.maroon : C.lightGray}` }}>
                <span className="text-xs font-medium" style={{ color: C.charcoal }}>{z.name}</span>
                <span className="text-xs font-bold" style={{ color: C.maroon }}>KSh {z.fee}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold mb-2" style={{ color: C.charcoal }}>Order summary</p>
          <div className="p-4 rounded-xl flex flex-col gap-2" style={{ border: `1px solid ${C.lightGray}` }}>
            <div className="flex justify-between text-xs"><span style={{ color: C.gray }}>Items ({items.length})</span><span className="font-semibold">KSh {subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between text-xs"><span style={{ color: C.gray }}>Delivery fee</span><span className="font-semibold">KSh {zone.fee}</span></div>
            <div className="flex justify-between text-sm pt-1 border-t" style={{ borderColor: C.lightGray }}><span className="font-bold">Total</span><span className="font-bold" style={{ color: C.maroon }}>KSh {(subtotal + zone.fee).toLocaleString()}</span></div>
          </div>
        </div>
      </div>
      <div className="p-4 border-t" style={{ borderColor: C.lightGray }}>
        <Btn full disabled={items.length === 0} onClick={() => navigate("/payment")}>Continue to Payment</Btn>
      </div>
    </div>
  );
}
