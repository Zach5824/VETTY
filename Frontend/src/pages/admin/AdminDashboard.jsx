import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Hand, LogOut } from "lucide-react";
import { logout } from "../../store/slices/authSlice";
import StatCard from "../../components/StatCard";
import AdminNav from "../../components/AdminNav";
import { C, serif } from "../../theme/colors";

export default function AdminDashboard() {
  const auth = useSelector((s) => s.auth);
  const orders = useSelector((s) => s.orders.orders);
  const bookings = useSelector((s) => s.orders.bookings);
  const products = useSelector((s) => s.catalog.products);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  const pendingBookings = bookings.filter((b) => b.status === "pending").length;
  const lowStock = products.filter((p) => p.stock <= p.threshold).length;
  const sales = orders.reduce((s, o) => s + o.total, 0);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-5 h-16 shrink-0" style={{ background: C.maroon }}>
        <h1 className="text-base font-bold text-white">Dashboard</h1>
        <button onClick={() => { dispatch(logout()); navigate("/"); }}><LogOut size={17} color="#fff" /></button>
      </div>
      <div className="content-container flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        <p className="text-base font-bold flex items-center gap-2" style={{ fontFamily: serif, color: C.maroon }}>Welcome back, {auth.name} <Hand size={17} /></p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <StatCard label="Total sales" value={`KSh ${sales.toLocaleString()}`} sub="Across all orders" />
          <StatCard label="Orders" value={orders.length} sub={`${pendingOrders} pending approval`} subColor={C.warning} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <StatCard label="Service bookings" value={bookings.length} sub={`${pendingBookings} awaiting approval`} subColor={C.warning} />
          <StatCard label="Low stock items" value={lowStock} sub="Needs restocking" subColor={C.danger} />
        </div>
        <p className="text-sm font-semibold" style={{ color: C.charcoal }}>Sales this week</p>
        <div className="flex items-end gap-2 h-28 p-4 rounded-2xl" style={{ background: C.sectionBg }}>
          {[40, 65, 50, 80, 55, 90, 70].map((h, i) => (
            <div key={i} className="flex-1 rounded" style={{ height: `${h}%`, background: C.gold }} />
          ))}
        </div>
        <p className="text-sm font-semibold" style={{ color: C.charcoal }}>Recent activity</p>
        <div className="flex flex-col">
          {orders.slice(0, 3).map((o) => (
            <div key={o.id} className="flex justify-between py-2.5 border-b" style={{ borderColor: C.lightGray }}>
              <span className="text-xs" style={{ color: C.charcoal }}>Order #{o.id} — {o.label}</span>
              <span className="text-[11px]" style={{ color: C.gray }}>{o.when}</span>
            </div>
          ))}
        </div>
      </div>
      <AdminNav />
    </div>
  );
}
