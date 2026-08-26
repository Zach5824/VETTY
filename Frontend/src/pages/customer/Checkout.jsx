import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Home as HomeIcon } from "lucide-react";
import { setZone } from "../../store/slices/checkoutSlice";
// Import your clearCart action here from your cart slice if available
// import { clearCart } from "../../store/slices/cartSlice"; 
import ScreenHeader from "../../components/ScreenHeader";
import Btn from "../../components/Btn";
import C from "../../theme/colors";

export default function Checkout() {
  const cart = useSelector((s) => s.cart.items);
  const products = useSelector((s) => s.catalog.products);
  const zones = useSelector((s) => s.catalog.zones);
  const zoneId = useSelector((s) => s.checkout.zoneId);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const items = cart
    .map((c) => ({ ...c, product: products.find((p) => p.id === c.productId) }))
    .filter((c) => c.product);
  
  const subtotal = items.reduce((s, c) => s + c.product.price * c.qty, 0);
  const zone = zones.find((z) => z.id === zoneId) || zones[0];

  const handlePlaceOrder = async () => {
    if (subtotal <= 0) {
      setError("Your cart is empty.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("jwt_token");
      const res = await fetch("http://127.0.0.1:5000/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          user_id: 1, // Optional fallback if route does not rely purely on JWT identity
          total_amount: subtotal,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.msg || "Failed to place order");
      }

      // Optionally dispatch clearCart() here
      // dispatch(clearCart());

      // Redirect to Confirmation page with order details
      navigate("/confirmation", { state: { order: data } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <ScreenHeader title="Checkout" backTo="/cart" />
      <div className="content-container flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-5">
        <div>
          <p className="text-sm font-semibold mb-2" style={{ color: C.charcoal }}>
            Delivery address
          </p>
          <div className="p-3 rounded-xl" style={{ border: `2px solid ${C.maroon}` }}>
            <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: C.maroon }}>
              <HomeIcon size={14} /> Home
            </p>
            <p className="text-xs mt-1" style={{ color: C.gray }}>
              Ngong Road, Nairobi - Apt 4B * +254 712 345 678
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold mb-2" style={{ color: C.charcoal }}>
            Delivery zone
          </p>
          <div className="flex flex-col gap-2">
            {zones.map((z) => (
              <button
                key={z.id}
                onClick={() => dispatch(setZone(z.id))}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs"
                style={{
                  borderColor: z.id === zone?.id ? C.maroon : C.gray,
                  color: z.id === zone?.id ? C.maroon : C.charcoal,
                }}
              >
                <span>{z.name}</span>
                <span>${z.fee}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}

        <div className="mt-auto pt-4">
          <Btn onClick={handlePlaceOrder} disabled={loading}>
            {loading ? "Processing..." : `Pay $${(subtotal + (zone?.fee || 0)).toFixed(2)}`}
          </Btn>
        </div>
      </div>
    </div>
  );
}