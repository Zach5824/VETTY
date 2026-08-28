import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { placeBooking } from "../../store/slices/ordersSlice";
import ScreenHeader from "../../components/ScreenHeader";
import Field from "../../components/Field";
import Btn from "../../components/Btn";
import { C } from "../../theme/colors";

const DAYS = ["Mon 12", "Tue 13", "Wed 14", "Thu 15", "Fri 16"];
const TIMES = ["9:00 AM", "11:00 AM", "1:00 PM", "3:00 PM"];

export default function Booking() {
  const { serviceId } = useParams();
  const service = useSelector((s) => s.catalog.services.find((x) => x.id === serviceId));
  const auth = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [day, setDay] = useState(1);
  const [time, setTime] = useState("11:00 AM");
  const [petName, setPetName] = useState("");
  const [notes, setNotes] = useState("");

  if (!service) return <div className="p-6 text-sm">Service not found.</div>;

  const confirm = () => {
    dispatch(placeBooking({
      serviceId: service.id, serviceName: service.name, petName: petName || "My pet",
      date: DAYS[day], time, notes, price: service.price, customer: auth.name || "You",
    }));
    navigate("/confirmation");
  };

  return (
    <div className="h-full flex flex-col">
      <ScreenHeader title={`Book: ${service.name}`} backTo="/services" />
      <div className="content-container flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold mb-2" style={{ color: C.charcoal }}>Select date</p>
          <div className="flex gap-2">
            {DAYS.map((d, i) => (
              <button key={d} onClick={() => setDay(i)} className="flex-1 py-3 rounded-xl flex flex-col items-center gap-0.5" style={{ background: day === i ? C.maroon : C.sectionBg }}>
                <span className="text-[10px]" style={{ color: day === i ? "#fff" : C.gray }}>{d.split(" ")[0]}</span>
                <span className="text-sm font-bold" style={{ color: day === i ? "#fff" : C.charcoal }}>{d.split(" ")[1]}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold mb-2" style={{ color: C.charcoal }}>Select time slot</p>
          <div className="grid grid-cols-2 gap-2">
            {TIMES.map((t) => (
              <button key={t} onClick={() => setTime(t)} className="py-3 rounded-xl text-sm font-semibold" style={{ background: time === t ? C.maroon : C.sectionBg, color: time === t ? "#fff" : C.charcoal }}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <Field label="Pet name" value={petName} onChange={setPetName} placeholder="e.g. Milo" />
        <Field label="Notes for the vet (optional)" value={notes} onChange={setNotes} placeholder="Any symptoms or concerns…" />
        <div className="flex justify-between items-center pt-1">
          <span className="text-sm" style={{ color: C.gray }}>Service fee</span>
          <span className="text-lg font-bold" style={{ color: C.maroon }}>KSh {service.price.toLocaleString()}</span>
        </div>
      </div>
      <div className="p-4 border-t" style={{ borderColor: C.lightGray }}>
        <Btn full onClick={confirm}>Confirm Booking</Btn>
      </div>
    </div>
  );
}
