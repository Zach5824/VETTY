import { createSlice } from "@reduxjs/toolkit";

const initialState = { toast: null };

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    showToast(state, action) { state.toast = action.payload; },
    clearToast(state) { state.toast = null; },
  },
});

export const { showToast, clearToast } = uiSlice.actions;
export default uiSlice.reducer;