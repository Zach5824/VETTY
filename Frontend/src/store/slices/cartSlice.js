import { createSlice } from "@reduxjs/toolkit";

const initialState = { items: [] }; // [{productId, qty}]

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart(state, action) {
      const { id, qty } = action.payload;
      const existing = state.items.find((c) => c.productId === id);
      if (existing) existing.qty += qty;
      else state.items.push({ productId: id, qty });
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
    clearCart(state) {
      state.items = [];
    },
  },
});

export const { addToCart, setQty, removeFromCart, clearCart } = cartSlice.actions;
export default cartSlice.reducer;