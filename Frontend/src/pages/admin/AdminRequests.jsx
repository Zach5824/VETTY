import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Check, CircleCheckBig, LogOut, X } from "lucide-react";
import { logout } from "../../store/slices/authSlice";
import { approveOrder, rejectOrder, approveBooking, rejectBooking } from "../../store/slices/ordersSlice";
import Badge from "../../components/Badge";
import Btn from "../../components/Btn";
import AdminNav from "../../components/AdminNav";
import { C } from "../../theme/colors";

export default function AdminRequests() {
  const [tab, setTab] = useState("orders");
  const orders = useSelector((s) => s.orders.orders);
  const bookings = useSelector((s) => s.orders.bookings);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const pendingBookings = bookings.filter((b) => b.status === "pending");

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-5 h-16 shrink-0" style={{ background: C.maroon }}>
        <h1 className="text-base font-bold text-white">Requests</h1>
        <button onClick={() => { dispatch(logout()); navigate("/"); }}><LogOut size={17} color="#fff" /></button>
      </div>
      <div className="content-container px-5 pt-3 flex flex-wrap gap-2 shrink-0">
        <button onClick={() => setTab("orders")} className="px-3.5 py-2 rounded-xl text-xs font-semibold" style={{ background: tab === "orders" ? C.maroon : C.sectionBg, color: tab === "orders" ? "#fff" : C.charcoal }}>
          Product Orders ({pendingOrders.length})
        </button>
        <button onClick={() => setTab("services")} className="px-3.5 py-2 rounded-xl text-xs font-semibold" style={{ background: tab === "services" ? C.maroon : C.sectionBg, color: tab === "services" ? "#fff" : C.charcoal }}>
          Service Requests ({pendingBookings.length})
        </button>
      </div>
      <div className="content-container flex-1 overflow-y-auto px-5 py-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 content-start">
        {tab === "orders" && pendingOrders.map((o) => (
          <div key={o.id} className="p-4 rounded-2xl flex flex-col gap-2" style={{ border: `1px solid ${C.lightGray}` }}>
            <div className="flex justify-between items-center">
              <p className="text-sm font-bold" style={{ color: C.charcoal }}>#{o.id}</p>
              <Badge>Pending</Badge>
            </div>
            <p className="text-xs" style={{ color: C.gray }}>{o.customer} · {o.label}</p>
            <p className="text-base font-bold" style={{ color: C.maroon }}>KSh {o.total.toLocaleString()}</p>
            <div className="flex gap-2">
              <Btn small variant="success" full icon={Check} onClick={() => dispatch(approveOrder(o.id))}>Approve</Btn>
              <Btn small variant="danger" full icon={X} onClick={() => dispatch(rejectOrder(o.id))}>Reject</Btn>
            </div>
          </div>
        ))}
        {tab === "orders" && pendingOrders.length === 0 && <p className="text-center text-sm py-10 flex items-center justify-center gap-2" style={{ color: C.gray }}><CircleCheckBig size={18} color={C.success} /> No pending orders</p>}
        {tab === "services" && pendingBookings.map((b) => (
          <div key={b.id} className="p-4 rounded-2xl flex flex-col gap-2" style={{ border: `1px solid ${C.lightGray}` }}>
            <div className="flex justify-between items-center">
              <p className="text-sm font-bold" style={{ color: C.charcoal }}>{b.serviceName}</p>
              <Badge>Pending</Badge>
            </div>
            <p className="text-xs" style={{ color: C.gray }}>{b.customer} · Pet: {b.petName} · {b.date}, {b.time}</p>
            <p className="text-base font-bold" style={{ color: C.maroon }}>KSh {b.price.toLocaleString()}</p>
            <div className="flex gap-2">
              <Btn small variant="success" full icon={Check} onClick={() => dispatch(approveBooking(b.id))}>Approve</Btn>
              <Btn small variant="danger" full icon={X} onClick={() => dispatch(rejectBooking(b.id))}>Reject</Btn>
            </div>
          </div>
        ))}
        {tab === "services" && pendingBookings.length === 0 && <p className="text-center text-sm py-10 flex items-center justify-center gap-2" style={{ color: C.gray }}><CircleCheckBig size={18} color={C.success} /> No pending requests</p>}
      </div>
      <AdminNav />
    </div>
  );
}
