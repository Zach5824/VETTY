export const seedProducts = [
  { id: "p1", name: "Premium Cat Food 2kg", price: 1450, category: "Food", stock: 42, threshold: 15, icon: "Fish", desc: "Grain-free salmon recipe for adult cats. Rich in omega-3 for a healthy coat." },
  { id: "p2", name: "Dog Chew Toy", price: 650, category: "Toys", stock: 8, threshold: 10, icon: "Bone", desc: "Durable rubber chew toy for medium to large dogs." },
  { id: "p3", name: "Fish Pellets 500g", price: 450, category: "Food", stock: 15, threshold: 20, icon: "Waves", desc: "Sinking pellets for tropical fish, boosts color & growth." },
  { id: "p4", name: "Chicken Vaccine (dose)", price: 900, category: "Medicine", stock: 0, threshold: 10, icon: "Syringe", desc: "Single-dose poultry vaccine, cold-chain verified." },
  { id: "p5", name: "Puppy Starter Food 1kg", price: 980, category: "Food", stock: 26, threshold: 10, icon: "Utensils", desc: "Balanced nutrition formulated for puppies 2–12 months." },
  { id: "p6", name: "Cat Scratching Post", price: 2200, category: "Accessories", stock: 12, threshold: 5, icon: "PawPrint", desc: "Sisal-wrapped scratching post with a plush perch on top." },
];

export const seedServices = [
  { id: "s1", name: "Health Checkup", price: 1200, duration: "30 min", icon: "Stethoscope", desc: "General wellness exam by a licensed vet." },
  { id: "s2", name: "Dog Vaccination", price: 1800, duration: "20 min", icon: "Syringe", desc: "Core vaccines for puppies & adult dogs." },
  { id: "s3", name: "Pet Grooming", price: 1500, duration: "60 min", icon: "Scissors", desc: "Bath, trim, nail clipping & de-shedding." },
  { id: "s4", name: "Dental Cleaning", price: 2200, duration: "45 min", icon: "Smile", desc: "Plaque removal & full oral health check." },
];

export const seedZones = [
  { id: "z1", name: "Zone A — Nairobi CBD", fee: 200, eta: "15–30 min" },
  { id: "z2", name: "Zone B — Westlands / Kilimani", fee: 300, eta: "30–45 min" },
  { id: "z3", name: "Zone C — Karen / Langata", fee: 450, eta: "45–60 min" },
];

export const seedOrders = [
  { id: "VT-10421", kind: "service", label: "Health Checkup", total: 1200, status: "completed", customer: "Peter Otieno", when: "2 days ago" },
  { id: "VT-10390", kind: "product", label: "3 items", total: 2150, status: "delivered", customer: "Amina Hassan", when: "4 days ago" },
];
