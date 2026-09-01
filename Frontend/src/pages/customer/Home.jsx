import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { PawPrint, Scissors, ShoppingBag, Stethoscope, Truck } from "lucide-react";
import Btn from "../../components/Btn";
import Badge from "../../components/Badge";
import ImgBox from "../../components/ImgBox";
import BottomNav from "../../components/BottomNav";
import { C, GRADIENT, serif } from "../../theme/colors";

export default function Home() {
  const navigate = useNavigate();
  const products = useSelector((s) => s.catalog.products);
  const featured = products.slice(0, 2);

  return (
    <div className="h-full flex flex-col">
      <div className="overflow-y-auto flex-1">
        <div className="px-6 pt-6 pb-8 relative overflow-hidden" style={{ background: GRADIENT }}>
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=1800&q=85')" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(115deg, rgba(7, 81, 127, 0.96), rgba(20, 112, 170, 0.84))" }} />
          <div className="absolute rounded-full" style={{ width: 220, height: 220, background: "rgba(255,255,255,0.08)", top: -80, right: -60, filter: "blur(10px)" }} />
          <div className="content-container mb-6 relative">
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: serif }}>Vetty<span style={{ color: C.gold }}>.</span></h1>
          </div>
          <div className="content-container relative">
            <Badge color="rgba(7,81,127,0.48)" fg={C.gold}><PawPrint size={13} /> Nairobi's Trusted Pet Shop</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-3 leading-tight" style={{ fontFamily: serif }}>
              Everything your<br /><span style={{ color: C.gold, fontStyle: "italic" }}>pet needs,</span><br />delivered fast.
            </h2>
            <p className="text-sm sm:text-base mt-3 max-w-2xl" style={{ color: "#fff", opacity: 0.9 }}>
              Order food, toys & accessories. Book grooming, vaccines and vet checkups — same-day delivery within Nairobi.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-5 max-w-xl">
              <Btn full onClick={() => navigate("/products")}>Shop Products →</Btn>
              <Btn full variant="outlineLight" onClick={() => navigate("/services")}>Book a Service</Btn>
            </div>
          </div>
        </div>

        <div className="content-container px-5 py-6">
          <h3 className="font-bold mb-3" style={{ fontFamily: serif, color: C.maroon }}>Quick actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[[Stethoscope, "Book Vet", "/services"], [Scissors, "Grooming", "/services"], [ShoppingBag, "Shop Food", "/products"], [Truck, "Track Order", "/history"]].map(([Icon, label, dest]) => (
              <button key={label} onClick={() => navigate(dest)} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl" style={{ background: C.sectionBg }}>
                <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#fff", color: C.maroon }}><Icon size={20} strokeWidth={1.8} /></span>
                <span className="text-[10px] font-medium" style={{ color: C.charcoal }}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="content-container px-5 pb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold" style={{ fontFamily: serif, color: C.maroon }}>Featured products</h3>
            <button className="text-xs font-semibold" style={{ color: C.rose }} onClick={() => navigate("/products")}>See all</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {featured.map((p) => (
              <button key={p.id} className="text-left rounded-2xl overflow-hidden" style={{ background: C.sectionBg }} onClick={() => navigate(`/products/${p.id}`)}>
                <ImgBox h={100} r={0} icon={p.icon} name={p.name} />
                <div className="p-3">
                  <p className="text-xs font-semibold" style={{ color: C.charcoal }}>{p.name}</p>
                  <p className="text-sm font-bold mt-1" style={{ color: C.maroon }}>KSh {p.price.toLocaleString()}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
