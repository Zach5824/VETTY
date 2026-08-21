import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { LogOut } from "lucide-react";
import { logout } from "../../store/slices/authSlice";
import ScreenHeader from "../../components/ScreenHeader";
import Btn from "../../components/Btn";
import BottomNav from "../../components/BottomNav";
import { C } from "../../theme/colors";

export default function Profile() {
  const auth = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col">
      <ScreenHeader title="Profile" backTo="/home" />
      <div className="content-container flex-1 px-6 py-6 flex flex-col items-center gap-1 max-w-2xl">
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold" style={{ background: C.sectionBg, color: C.maroon }}>
          {(auth.name || "G")[0]}
        </div>
        <p className="text-lg font-bold mt-3" style={{ color: C.charcoal }}>{auth.name}</p>
        <p className="text-xs" style={{ color: C.gray }}>Customer account</p>
        <div className="w-full mt-8 flex flex-col gap-2">
          <Btn full variant="ghost" onClick={() => navigate("/history")}>Order history</Btn>
          <Btn full variant="ghost" onClick={() => navigate("/admin/login")}>Switch to Admin view</Btn>
          <Btn full variant="danger" icon={LogOut} onClick={() => { dispatch(logout()); navigate("/"); }}>Log out</Btn>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
