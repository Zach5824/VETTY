import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { CheckCircle2 } from "lucide-react";
import Btn from "../../components/Btn";
import { C, serif } from "../../theme/colors";

export default function Confirmation() {
  const id = useSelector((s) => s.orders.selectedOrderId);
  const navigate = useNavigate();
  return (
    <div className="h-full w-full max-w-2xl mx-auto flex flex-col items-center justify-center text-center px-8">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ background: C.success }}>
        <CheckCircle2 size={38} color="#fff" />
      </div>
      <h2 className="text-2xl font-bold" style={{ fontFamily: serif, color: C.maroon }}>All set!</h2>
      <p className="text-sm mt-2" style={{ color: C.gray }}>
        Your order <b style={{ color: C.charcoal }}>#{id}</b> has been placed. You'll get a notification once it's confirmed.
      </p>
      <div className="w-full flex flex-col gap-3 mt-8">
        <Btn full onClick={() => navigate(`/tracking/${id}`)}>Track My Order</Btn>
        <Btn full variant="outline" onClick={() => navigate("/home")}>Back to Home</Btn>
      </div>
    </div>
  );
}
