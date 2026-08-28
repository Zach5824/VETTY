import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { CreditCard, ShieldCheck } from "lucide-react";
import { setPayment } from "../../store/slices/checkoutSlice";
import { placeOrder } from "../../store/slices/ordersSlice";
import { decrementStock } from "../../store/slices/catalogSlice";
import { clearCart } from "../../store/slices/cartSlice";
import ScreenHeader from "../../components/ScreenHeader";
import Field from "../../components/Field";
import Btn from "../../components/Btn";
import { C } from "../../theme/colors";

const METHODS = [
  { id: "mpesa", label: "M-Pesa", sub: "Pay via Safaricom M-Pesa STK push" },
  { id: "stripe", label: "Stripe (Card)", sub: "Visa, Mastercard & more" },
  { id: "cod", label: "Cash on Delivery", sub: "Pay when your order arrives" },
];

export default function Payment() {
  const cart = useSelector((s) => s.cart.items);
  const products = useSelector((s) => s.catalog.products);
  const zones = useSelector((s) => s.catalog.zones);
  const zoneId = useSelector((s) => s.checkout.zoneId);
  const method = useSelector((s) => s.checkout.paymentMethod);
  const auth = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const items = cart.map((c) => ({ ...c, product: products.find((p) => p.id === c.productId) })).filter((c) => c.product);
  const subtotal = items.reduce((s, c) => s + c.product.price * c.qty, 0);
  const zone = zones.find((z) => z.id === zoneId) || zones[0];
  const total = subtotal + zone.fee;

  const pay = () => {
    dispatch(placeOrder({
      items: items.map((i) => ({ productId: i.productId, qty: i.qty, price: i.product.price })),
      total, customer: auth.name || "You", payment: method,
    }));
    dispatch(decrementStock(items.map((i) => ({ productId: i.productId, qty: i.qty }))));
    dispatch(clearCart());
    navigate("/confirmation");
  };

  return (
    <div className="h-full flex flex-col">
      <ScreenHeader title="Payment" backTo="/checkout" />
      <div className="content-container flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-4">
        <p className="text-sm font-semibold" style={{ color: C.charcoal }}>Select payment method</p>
        {METHODS.map((m) => (
          <button key={m.id} onClick={() => dispatch(setPayment(m.id))} className="flex items-center justify-between px-4 py-3.5 rounded-xl" style={{ border: `${method === m.id ? 2 : 1}px solid ${method === m.id ? C.maroon : C.lightGray}` }}>
            <div className="text-left">
              <p className="text-sm font-semibold" style={{ color: C.charcoal }}>{m.label}</p>
              <p className="text-[11px]" style={{ color: C.gray }}>{m.sub}</p>
            </div>
            <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ border: `2px solid ${method === m.id ? C.maroon : C.lightGray}` }}>
              {method === m.id && <div className="w-2 h-2 rounded-full" style={{ background: C.maroon }} />}
            </div>
          </button>
        ))}
        {method === "mpesa" && <Field label="M-Pesa phone number" value="+254 712 345 678" onChange={() => {}} />}
        <div className="flex justify-between items-center pt-2">
          <span className="text-sm" style={{ color: C.gray }}>Amount to pay</span>
          <span className="text-xl font-bold" style={{ color: C.maroon }}>KSh {total.toLocaleString()}</span>
        </div>
      </div>
      <div className="p-4 border-t flex flex-col items-center gap-2" style={{ borderColor: C.lightGray }}>
        <Btn full icon={CreditCard} onClick={pay}>Pay KSh {total.toLocaleString()} Securely</Btn>
        <p className="text-[10px] flex items-center gap-1" style={{ color: C.gray }}><ShieldCheck size={11} /> Payments are encrypted and secure</p>
      </div>
    </div>
  );
}
