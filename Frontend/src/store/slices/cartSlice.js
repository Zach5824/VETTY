import { createSlice } from "@reduxjs/toolkit";

const initialState = { items: [] }; // [{productId, qty, selected}]

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart(state, action) {
      const { id, qty } = action.payload;
      const existing = state.items.find((c) => c.productId === id);
      if (existing) {
        existing.qty += qty;
        existing.selected = true;
      } else state.items.push({ productId: id, qty, selected: true });
    },
    setQty(state, action) {
      const { id, delta } = action.payload;
      const item = state.items.find((c) => c.productId === id);
      if (item) item.qty = Math.max(0, item.qty + delta);
      state.items = state.items.filter((c) => c.qty > 0);
    },
    removeFromCart(state, action) {
      state.items = state.items.filter((c) => c.productId !== action.payload);
    },
    setSelected(state, action) {
      const item = state.items.find((c) => c.productId === action.payload.id);
      if (item) item.selected = action.payload.selected;
    },
    clearSelectedCart(state) {
      state.items = state.items.filter((c) => !c.selected);
    },
    clearCart(state) {
      state.items = [];
    },
  },
});

export const { addToCart, setQty, removeFromCart, setSelected, clearSelectedCart, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
