import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { CreditCard, ShieldCheck } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { setPayment } from "../../store/slices/checkoutSlice";
import { placeOrder } from "../../store/slices/ordersSlice";
import { decrementStock } from "../../store/slices/catalogSlice";
import { clearSelectedCart } from "../../store/slices/cartSlice";
import ScreenHeader from "../../components/ScreenHeader";
import Field from "../../components/Field";
import Btn from "../../components/Btn";
import { C } from "../../theme/colors";
import StripeCheckoutForm from "../../components/StripeCheckoutForm";
import { api, API_BASE } from "../../lib/api";

const METHODS = [
  { id: "mpesa", label: "M-Pesa", sub: "Pay via Safaricom M-Pesa STK push" },
  { id: "stripe", label: "Stripe (Card)", sub: "Visa, Mastercard & more" },
];

export default function Payment() {
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [stripeSetup, setStripeSetup] = useState(null);
  const [pendingPayment, setPendingPayment] = useState(null);
  const cart = useSelector((s) => s.cart.items);
  const products = useSelector((s) => s.catalog.products);
  const zones = useSelector((s) => s.catalog.zones);
  const zoneId = useSelector((s) => s.checkout.zoneId);
  const method = useSelector((s) => s.checkout.paymentMethod);
  const auth = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const items = cart.map((c) => ({ ...c, product: products.find((p) => p.id === c.productId) })).filter((c) => c.product && c.selected !== false);
  const subtotal = items.reduce((s, c) => s + c.product.price * c.qty, 0);
  const zone = zones.find((z) => z.id === zoneId) || zones[0];
  const total = subtotal + zone.fee;

  const finishOrder = () => {
    dispatch(placeOrder({
      items: items.map((i) => ({ productId: i.productId, qty: i.qty, price: i.product.price })),
      total, customer: auth.name || "You", payment: method,
    }));
    dispatch(decrementStock(items.map((i) => ({ productId: i.productId, qty: i.qty }))));
    dispatch(clearSelectedCart());
    navigate("/confirmation");
  };

  const createServerOrder = async () => {
    if (!auth.token) throw new Error("Please sign in before paying.");
    const headers = { Authorization: `Bearer ${auth.token}` };
    const order = await api("/api/orders", {
      method: "POST", token: auth.token, body: JSON.stringify({ total_amount: total }),
    });
    return { order, headers };
  };

  useEffect(() => {
    if (!pendingPayment) return undefined;
    let cancelled = false;

    const checkPayment = async () => {
      try {
        const payment = await api(`/api/payments/${pendingPayment.id}`, { token: auth.token });
        if (cancelled) return;
        if (payment.status === "paid") {
          setPendingPayment(null);
          finishOrder();
        } else if (payment.status === "failed") {
          setPendingPayment(null);
          setStripeSetup(null);
          setPaymentError("Payment was not completed. Please try again.");
        }
      } catch (error) {
        if (!cancelled) setPaymentError(error.message);
      }
    };

    checkPayment();
    const timer = window.setInterval(checkPayment, 3000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [pendingPayment]);

  const startMpesa = async () => {
    if (!mpesaPhone.trim()) return setPaymentError("Enter the M-Pesa phone number that should receive the prompt.");
    setIsStarting(true); setPaymentError("");
    try {
      const { order, headers } = await createServerOrder();
      const payment = await api("/api/payments/mpesa/stk-push", {
        method: "POST", token: auth.token,
        body: JSON.stringify({ order_id: order.id, phone: mpesaPhone }),
      });
      setPendingPayment({ id: payment.payment.id, headers });
    } catch (error) {
      setPaymentError(error.message);
    } finally {
      setIsStarting(false);
    }
  };

  const startStripe = async () => {
    setIsStarting(true); setPaymentError("");
    try {
      const { order, headers } = await createServerOrder();
      const payment = await api("/api/payments/stripe/intents", {
        method: "POST", token: auth.token, body: JSON.stringify({ order_id: order.id }),
      });
      if (!payment.publishable_key) throw new Error("Stripe is not configured with a publishable key.");
      setStripeSetup({
        clientSecret: payment.client_secret,
        paymentId: payment.payment.id,
        headers,
        stripePromise: loadStripe(payment.publishable_key),
      });
    } catch (error) {
      setPaymentError(error.message);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <ScreenHeader title="Payment" backTo="/checkout" />
      <div className="content-container flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-4">
        <p className="text-sm font-semibold" style={{ color: C.charcoal }}>Select payment method</p>
        {METHODS.map((m) => (
          <button key={m.id} disabled={Boolean(pendingPayment)} onClick={() => { dispatch(setPayment(m.id)); setPaymentError(""); setStripeSetup(null); }} className="flex items-center justify-between px-4 py-3.5 rounded-xl disabled:opacity-60" style={{ border: `${method === m.id ? 2 : 1}px solid ${method === m.id ? C.maroon : C.lightGray}` }}>
            <div className="text-left">
              <p className="text-sm font-semibold" style={{ color: C.charcoal }}>{m.label}</p>
              <p className="text-[11px]" style={{ color: C.gray }}>{m.sub}</p>
            </div>
            <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ border: `2px solid ${method === m.id ? C.maroon : C.lightGray}` }}>
              {method === m.id && <div className="w-2 h-2 rounded-full" style={{ background: C.maroon }} />}
            </div>
          </button>
        ))}
        {method === "mpesa" && (
          <Field
            label="M-Pesa phone number"
            value={mpesaPhone}
            onChange={setMpesaPhone}
            placeholder="0712 345 678"
            type="tel"
            required
          />
        )}
        {method === "stripe" && stripeSetup && !pendingPayment && (
          <StripeCheckoutForm
            stripePromise={stripeSetup.stripePromise}
            clientSecret={stripeSetup.clientSecret}
            onSuccess={() => setPendingPayment({ id: stripeSetup.paymentId, headers: stripeSetup.headers })}
            onProcessing={() => setPendingPayment({ id: stripeSetup.paymentId, headers: stripeSetup.headers })}
            onError={setPaymentError}
          />
        )}
        {pendingPayment && (
          <p className="text-xs font-medium" style={{ color: C.gray }}>
            {method === "mpesa" ? "M-Pesa prompt sent. Complete it on your phone; your order will be placed once payment is confirmed." : "Waiting for Stripe to confirm your payment…"}
          </p>
        )}
        {paymentError && <p className="text-xs font-medium" style={{ color: C.danger }}>{paymentError}</p>}
        <div className="flex justify-between items-center pt-2">
          <span className="text-sm" style={{ color: C.gray }}>Amount to pay</span>
          <span className="text-xl font-bold" style={{ color: C.maroon }}>KSh {total.toLocaleString()}</span>
        </div>
      </div>
      <div className="p-4 border-t flex flex-col items-center gap-2" style={{ borderColor: C.lightGray }}>
        {!stripeSetup && <Btn full icon={CreditCard} disabled={isStarting || Boolean(pendingPayment) || items.length === 0} onClick={method === "mpesa" ? startMpesa : startStripe}>
          {isStarting ? "Starting payment…" : pendingPayment ? "Waiting for payment confirmation…" : method === "mpesa" ? `Send M-Pesa prompt for KSh ${total.toLocaleString()}` : "Continue to card payment"}
        </Btn>}
        <p className="text-[10px] flex items-center gap-1" style={{ color: C.gray }}><ShieldCheck size={11} /> Payments are encrypted and secure</p>
      </div>
    </div>
  );
}
