import { createSlice } from "@reduxjs/toolkit";

const initialState = { zoneId: "z1", paymentMethod: "mpesa" };

const checkoutSlice = createSlice({
  name: "checkout",
  initialState,
  reducers: {
    setZone(state, action) { state.zoneId = action.payload; },
    setPayment(state, action) { state.paymentMethod = action.payload; },
  },
});

export const { setZone, setPayment } = checkoutSlice.actions;
export default checkoutSlice.reducer;