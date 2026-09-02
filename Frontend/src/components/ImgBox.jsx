import React from "react";
import { C } from "../theme/colors";

const photos = {
  Bone: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&w=800&q=80",
  Fish: "https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?auto=format&fit=crop&w=800&q=80",
  MapPinned: "https://images.unsplash.com/photo-1524666041070-9d87656c25bb?auto=format&fit=crop&w=800&q=80",
  Package: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=800&q=80",
  PawPrint: "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=800&q=80",
  Scissors: "https://images.unsplash.com/photo-1596272875729-ed2ff7d6d9c5?auto=format&fit=crop&w=800&q=80",
  Smile: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=800&q=80",
  Stethoscope: "https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?auto=format&fit=crop&w=800&q=80",
  Syringe: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=800&q=80",
  Utensils: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=800&q=80",
  Waves: "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&w=800&q=80",
};

const itemPhotos = [
  ["premium cat food", "https://images.ctfassets.net/b85ozb2q358o/4X80WIXKTyRotXu5AZASkf/d3bbfdc4bdb959564d60faec65a351ff/conservation_croquettes_chat_5.jpeg"],
  ["dog chew toy", "https://images.unsplash.com/photo-1733861392389-cee0cfb9e6ab?auto=format&fit=crop&w=800&q=80"],
  ["fish pellets", "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&w=800&q=80"],
  ["chicken vaccine", "https://sadaf-food.com/wp-content/uploads/2025/11/shot_of_a_veterinarian_giving_an_injection_to_a_ch_2025_04_06_01-1-1.jpg"],
  ["puppy starter food", "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=800&q=80"],
  ["cat scratching post", "https://catfriendly.com/wp-content/uploads/2021/07/scratching-post.jpg"],
  ["health checkup", "https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?auto=format&fit=crop&w=800&q=80"],
  ["dog vaccination", "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=800&q=80"],
  ["pet grooming", "https://images.unsplash.com/photo-1596272875729-ed2ff7d6d9c5?auto=format&fit=crop&w=800&q=80"],
  ["dental cleaning", "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=800&q=80"],
];

function photoFor(icon, name) {
  const matchedPhoto = itemPhotos.find(([itemName]) => name?.toLowerCase().includes(itemName));
  return matchedPhoto?.[1] || photos[icon] || photos.Package;
}

export default function ImgBox({ h = 120, r = 12, icon = "PawPrint", name = "", className = "" }) {
  return (
    <div
      className={`shrink-0 overflow-hidden ${className}`}
      style={{ height: h, borderRadius: r, background: `linear-gradient(145deg, ${C.sectionBg}, #DCEFF9)` }}
    >
      <img
        src={photoFor(icon, name)}
        alt={name ? `${name} photo` : "Pet care product or service"}
        className="block h-full w-full object-cover object-center"
        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
        loading="lazy"
        onError={(event) => { event.currentTarget.style.display = "none"; }}
      />
    </div>
  );
}
