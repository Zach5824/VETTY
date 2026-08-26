import React, { useEffect, useState } from "react";
import { Clock, CheckCircle, Package } from "lucide-react";
import ScreenHeader from "../../components/ScreenHeader";
import C from "../../theme/colors";

export default function History() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("jwt_token");
        const res = await fetch("http://127.0.0.1:5000/api/orders", {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.msg || "Failed to load order history");
        }

        setOrders(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  return (
    <div className="h-full flex flex-col">
      <ScreenHeader title="Order History" backTo="/" />

      <div className="content-container flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-3">
        {loading && (
          <p className="text-xs text-center text-gray-500 py-4">Loading your orders...</p>
        )}

        {error && (
          <p className="text-xs text-center text-red-500 py-4">{error}</p>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Package size={32} style={{ color: C.gray }} />
            <p className="text-xs font-semibold" style={{ color: C.gray }}>
              No past orders found.
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          orders.map((order) => (
            <div
              key={order.id}
              className="p-3.5 rounded-xl flex items-center justify-between border"
              style={{ borderColor: "#eee", backgroundColor: "#fff" }}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: C.charcoal }}>
                    Order #{order.id}
                  </span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
                    style={{
                      backgroundColor: order.status === "completed" ? "#e6f4ea" : "#fff4e5",
                      color: order.status === "completed" ? "#137333" : "#b06000",
                    }}
                  >
                    {order.status === "completed" ? (
                      <CheckCircle size={10} />
                    ) : (
                      <Clock size={10} />
                    )}
                    {order.status}
                  </span>
                </div>
                <p className="text-[11px]" style={{ color: C.gray }}>
                  {order.created_at}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold" style={{ color: C.maroon }}>
                  ${Number(order.total_amount).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}