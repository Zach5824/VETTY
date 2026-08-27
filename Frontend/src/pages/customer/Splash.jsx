import React from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { HeartPulse, PackageCheck, Scissors, ShieldCheck, Stethoscope, Truck } from "lucide-react";
import { login } from "../../store/slices/authSlice";
import Btn from "../../components/Btn";
import { C, GRADIENT, serif } from "../../theme/colors";

export default function Splash() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  return (
    <div className="h-full w-full overflow-y-auto" style={{ background: C.sectionBg }}>
      <section className="relative overflow-hidden px-6 py-8 sm:py-14" style={{ background: GRADIENT }}>
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1800&q=85')" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(115deg, rgba(7, 81, 127, 0.95), rgba(20, 112, 170, 0.82))" }} />
        <div className="absolute rounded-full opacity-10 bg-white -top-20 -right-16 w-72 h-72" />
        <div className="content-container relative text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white" style={{ fontFamily: serif }}>Vetty<span style={{ color: C.gold }}>.</span></h1>
          <p className="text-xs mt-2 tracking-[0.18em]" style={{ color: C.gold }}>NAIROBI'S TRUSTED PET SHOP</p>
          <h2 className="mt-7 text-3xl sm:text-5xl font-bold leading-tight text-white" style={{ fontFamily: serif }}>
            Better care for every <span style={{ color: C.gold, fontStyle: "italic" }}>paw.</span>
          </h2>
          <p className="max-w-2xl mx-auto mt-4 text-sm sm:text-base leading-6 text-white/90">
            Vetty brings pet essentials, trusted veterinary care and convenient grooming together in one easy place.
          </p>
          <div className="mt-7 w-full max-w-lg mx-auto flex flex-col sm:flex-row gap-3">
            <Btn full onClick={() => navigate("/login")}>Shop &amp; book services</Btn>
            <Btn full variant="outlineLight" onClick={() => navigate("/login")}>
              Sign in to continue
            </Btn>
          </div>
        </div>
      </section>

      <main className="content-container px-5 py-7 sm:py-10">
        <section className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-bold tracking-widest" style={{ color: C.rose }}>ONE PLACE FOR PET CARE</p>
          <h3 className="mt-2 text-2xl sm:text-3xl font-bold" style={{ color: C.maroon, fontFamily: serif }}>Everything your pet needs</h3>
          <p className="mt-3 text-sm leading-6" style={{ color: C.gray }}>From everyday food and toys to professional care, we make looking after your companion simple, reliable and local.</p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-7">
          {[
            [PackageCheck, "Pet essentials", "Food, treats, toys and accessories from trusted brands."],
            [Stethoscope, "Vet care", "Book checkups, vaccines and expert care for your pet."],
            [Scissors, "Grooming", "Keep pets clean, comfortable and looking their best."],
            [Truck, "Fast delivery", "Convenient same-day delivery across Nairobi zones."],
          ].map(([Icon, title, description]) => (
            <article key={title} className="rounded-2xl bg-white p-5 shadow-sm text-left">
              <span className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: C.sectionBg, color: C.maroon }}><Icon size={21} /></span>
              <h4 className="mt-4 text-base font-bold" style={{ color: C.maroon }}>{title}</h4>
              <p className="mt-1 text-xs leading-5" style={{ color: C.gray }}>{description}</p>
            </article>
          ))}
        </section>

        <section className="mt-7 rounded-3xl px-5 py-6 sm:px-8 sm:py-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5" style={{ background: C.maroon }}>
          <div className="flex gap-3">
            <HeartPulse className="shrink-0" size={28} color={C.gold} />
            <div><h3 className="font-bold text-white" style={{ fontFamily: serif }}>Care that fits your day</h3><p className="mt-1 text-xs leading-5 text-white/80">Shop, book a service, pay securely and follow your order from one account.</p></div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold shrink-0" style={{ color: C.gold }}><ShieldCheck size={16} /> Trusted local care</div>
        </section>

        <div className="text-center pt-7 pb-2">
          <button className="text-xs underline" style={{ color: C.gray }} onClick={() => navigate("/admin/login")}>Admin sign in</button>
        </div>
      </main>
    </div>
  );
}
