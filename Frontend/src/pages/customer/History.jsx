import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import ScreenHeader from "../../components/ScreenHeader";
import Badge from "../../components/Badge";
import BottomNav from "../../components/BottomNav";
import { C, statusColor } from "../../theme/colors";

export default function History() {
  const orders = useSelector((s) => s.orders.orders);
  const bookings = useSelector((s) => s.orders.bookings);
  const navigate = useNavigate();

  const all = [
    ...orders.map((o) => ({ ...o, kindLabel: o.kind === "service" ? o.label : `${o.label} · KSh ${o.total.toLocaleString()}` })),
    ...bookings.map((b) => ({ id: b.id, kindLabel: `${b.date}, ${b.time}`, status: b.status, total: b.price, label: b.serviceName })),
  ];

  return (
    <div className="h-full flex flex-col">
      <ScreenHeader title="My Orders" backTo="/home" />
      <div className="content-container flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-3">
        {all.length === 0 && <p className="text-center text-sm py-10" style={{ color: C.gray }}>No orders yet.</p>}
        {all.map((o) => {
          const [bg, fg] = statusColor(o.status);
          return (
            <div key={o.id} className="p-4 rounded-2xl flex flex-col gap-2" style={{ border: `1px solid ${C.lightGray}` }}>
              <div className="flex justify-between items-center">
                <p className="text-sm font-bold" style={{ color: C.charcoal }}>#{o.id}</p>
                <Badge color={bg} fg={fg}>{o.status}</Badge>
              </div>
              <p className="text-xs" style={{ color: C.gray }}>{o.kindLabel}</p>
              <div className="flex justify-between items-center">
                <button onClick={() => navigate(`/tracking/${o.id}`)} className="text-xs font-semibold" style={{ color: C.rose }}>View details →</button>
                {o.status === "delivered" && (
                  <button onClick={() => navigate(`/review/${o.id}`)} className="text-xs font-semibold" style={{ color: C.gold }}>Rate order</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <BottomNav />
    </div>
  );
}
