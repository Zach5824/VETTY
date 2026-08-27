import { createSlice, nanoid } from "@reduxjs/toolkit";
import { seedProducts, seedServices, seedZones } from "../../data/seed";

const initialState = {
  products: seedProducts,
  services: seedServices,
  zones: seedZones,
};

const catalogSlice = createSlice({
  name: "catalog",
  initialState,
  reducers: {
    addProduct(state, action) {
      state.products.unshift({ id: "p" + nanoid(6), ...action.payload });
    },
    updateProduct(state, action) {
      const p = state.products.find((x) => x.id === action.payload.id);
      if (p) Object.assign(p, action.payload.patch);
    },
    deleteProduct(state, action) {
      state.products = state.products.filter((p) => p.id !== action.payload);
    },
    // called when an order is placed to deduct purchased quantities
    decrementStock(state, action) {
      action.payload.forEach(({ productId, qty }) => {
        const p = state.products.find((x) => x.id === productId);
        if (p) p.stock = Math.max(0, p.stock - qty);
      });
    },
    setThreshold(state, action) {
      const p = state.products.find((x) => x.id === action.payload.id);
      if (p) p.threshold = action.payload.value;
    },
    addService(state, action) {
      state.services.unshift({ id: "s" + nanoid(6), ...action.payload });
    },
    deleteService(state, action) {
      state.services = state.services.filter((s) => s.id !== action.payload);
    },
    addZone(state, action) {
      state.zones.push({ id: "z" + nanoid(6), ...action.payload });
    },
    hydrateCatalog(state, action) {
      const { products, services, zones } = action.payload;
      if (products?.length) state.products = products;
      if (services?.length) state.services = services;
      if (zones?.length) state.zones = zones;
    },
  },
});
export const {
  addProduct, updateProduct, deleteProduct, decrementStock,
  setThreshold, addService, deleteService, addZone, hydrateCatalog,
} = catalogSlice.actions;
export default catalogSlice.reducer;
