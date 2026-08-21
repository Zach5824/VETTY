import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { CheckCircle2, Truck } from "lucide-react";
import ScreenHeader from "../../components/ScreenHeader";
import ImgBox from "../../components/ImgBox";
import Badge from "../../components/Badge";
import Btn from "../../components/Btn";
import BottomNav from "../../components/BottomNav";
import { C } from "../../theme/colors";

export default function Tracking() {
  const { orderId } = useParams();
  const orders = useSelector((s) => s.orders.orders);
  const fallbackId = useSelector((s) => s.orders.selectedOrderId);
  const order = orders.find((o) => o.id === (orderId || fallbackId)) || orders[0];
  const navigate = useNavigate();

  const steps = [
    ["Order placed", true],
    ["Payment confirmed", true],
    ["Preparing your order", order && order.status !== "pending"],
    ["Out for delivery", order && (order.status === "out_for_delivery" || order.status === "delivered")],
    ["Delivered", order && order.status === "delivered"],
  ];

  return (
    <div className="h-full flex flex-col">
      <ScreenHeader title={order ? `Order #${order.id}` : "Tracking"} backTo="/home" />
      <div className="content-container flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
        <ImgBox h={150} r={16} icon="MapPinned" />
        <Badge><Truck size={13} /> {order ? order.status.replace(/_/g, " ") : "pending"}</Badge>
        <p className="text-sm font-semibold" style={{ color: C.charcoal }}>Estimated arrival: Today, 4:30 PM</p>
        <div className="flex flex-col gap-4">
          {steps.map(([label, done]) => (
            <div key={label} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: done ? C.success : C.lightGray }}>
                {done && <CheckCircle2 size={12} color="#fff" />}
              </div>
              <p className="text-sm font-medium" style={{ color: done ? C.charcoal : C.gray }}>{label}</p>
            </div>
          ))}
        </div>
        <Btn full variant="outline">Contact Rider</Btn>
      </div>
      <BottomNav />
    </div>
  );
}
