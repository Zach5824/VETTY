import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import ScreenHeader from "../../components/ScreenHeader";
import ImgBox from "../../components/ImgBox";
import BottomNav from "../../components/BottomNav";
import { C, serif } from "../../theme/colors";

export default function Services() {
  const services = useSelector((s) => s.catalog.services);
  const navigate = useNavigate();
  return (
    <div className="h-full flex flex-col">
      <ScreenHeader title="Services" backTo="/home" />
      <div className="content-container flex-1 overflow-y-auto px-5 py-3">
        <p className="text-sm font-semibold" style={{ color: C.maroon, fontFamily: serif }}>Book a vet service near you</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 mt-3">
        {services.map((s) => (
          <button key={s.id} onClick={() => navigate(`/booking/${s.id}`)} className="flex items-center gap-3 p-3 rounded-3xl text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md" style={{ background: "#fff", border: `1px solid ${C.lightGray}` }}>
            <ImgBox h={72} r={16} icon={s.icon} name={s.name} className="w-20" />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: C.charcoal }}>{s.name}</p>
              <p className="text-[11px] mt-0.5" style={{ color: C.gray }}>{s.desc}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs font-bold" style={{ color: C.maroon }}>KSh {s.price.toLocaleString()}</p>
                <span className="text-[10px]" style={{ color: C.gray }}>· {s.duration}</span>
              </div>
            </div>
          </button>
        ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
