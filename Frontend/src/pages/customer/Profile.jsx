import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Camera, LogOut } from "lucide-react";
import { logout, setProfilePhoto } from "../../store/slices/authSlice";
import ScreenHeader from "../../components/ScreenHeader";
import Btn from "../../components/Btn";
import BottomNav from "../../components/BottomNav";
import { C } from "../../theme/colors";

export default function Profile() {
  const auth = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const photoInput = useRef(null);
  const [photoError, setPhotoError] = useState("");

  const choosePhoto = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setPhotoError("Choose an image file.");
    if (file.size > 2 * 1024 * 1024) return setPhotoError("Choose an image smaller than 2 MB.");

    const reader = new FileReader();
    reader.onload = () => {
      const profilePhoto = reader.result;
      dispatch(setProfilePhoto(profilePhoto));
      setPhotoError("");
      api("/api/auth/me", { method: "PATCH", token: auth.token, body: JSON.stringify({ profile_photo: profilePhoto }) })
        .catch(() => setPhotoError("Photo saved on this device. It could not be synced to your account."));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="h-full flex flex-col">
      <ScreenHeader title="Profile" backTo="/home" />
      <div className="content-container flex-1 px-6 py-6 flex flex-col items-center gap-1 max-w-2xl">
        <div className="relative">
          <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-2xl font-bold" style={{ background: C.sectionBg, color: C.maroon }}>
            {auth.profilePhoto ? <img src={auth.profilePhoto} alt="Your profile" className="h-full w-full object-cover" /> : (auth.name || "G")[0]}
          </div>
          <button type="button" aria-label="Choose profile photo" onClick={() => photoInput.current?.click()} className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full flex items-center justify-center text-white shadow-sm" style={{ background: C.maroon }}>
            <Camera size={15} />
          </button>
          <input ref={photoInput} onChange={choosePhoto} type="file" accept="image/*" className="hidden" />
        </div>
        <button type="button" onClick={() => photoInput.current?.click()} className="mt-2 text-xs font-semibold" style={{ color: C.rose }}>Add or change photo</button>
        {photoError && <p role="alert" className="text-xs text-red-600 text-center">{photoError}</p>}
        <p className="text-lg font-bold mt-3" style={{ color: C.charcoal }}>{auth.name}</p>
        <p className="text-xs" style={{ color: C.gray }}>Customer account</p>
        <div className="w-full mt-8 flex flex-col gap-2">
          <Btn full variant="ghost" onClick={() => navigate("/history")}>Order history</Btn>
          <Btn full variant="danger" icon={LogOut} onClick={() => { dispatch(logout()); navigate("/"); }}>Log out</Btn>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
