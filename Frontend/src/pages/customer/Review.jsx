import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { PawPrint, Star } from "lucide-react";
import { submitReview } from "../../store/slices/ordersSlice";
import { showToast } from "../../store/slices/uiSlice";
import ScreenHeader from "../../components/ScreenHeader";
import Btn from "../../components/Btn";
import { C } from "../../theme/colors";

export default function Review() {
  const { orderId } = useParams();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const submit = () => {
    dispatch(submitReview({ orderId, rating, comment }));
    dispatch(showToast("Thanks for your review!"));
    navigate("/history");
  };

  return (
    <div className="h-full flex flex-col">
      <ScreenHeader title="Rate your order" backTo="/history" />
      <div className="content-container flex-1 flex flex-col items-center px-6 py-6 gap-4 text-center overflow-y-auto max-w-2xl">
        <div className="w-[90px] h-[90px] rounded-full flex items-center justify-center" style={{ background: C.sectionBg }}><PawPrint size={36} color={C.maroon} /></div>
        <p className="text-sm font-semibold" style={{ color: C.charcoal }}>Order #{orderId}</p>
        <p className="text-xs" style={{ color: C.gray }}>How was your experience?</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setRating(n)}>
              <Star size={28} fill={n <= rating ? C.gold : "none"} color={C.gold} />
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share details about the product quality, delivery speed, and packaging…"
          className="w-full h-28 rounded-xl p-4 text-sm outline-none resize-none"
          style={{ background: C.sectionBg, color: C.charcoal }}
        />
        <Btn full onClick={submit}>Submit Review</Btn>
      </div>
    </div>
  );
}
