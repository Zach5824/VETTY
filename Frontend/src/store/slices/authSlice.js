import { createSlice } from "@reduxjs/toolkit";

const emptyState = { loggedIn: false, role: null, name: "", email: "", token: null };
const initialState = JSON.parse(localStorage.getItem("vetty-session") || "null") || emptyState;

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login(state, action) {
      state.loggedIn = true;
      state.role = action.payload.role;
      state.name = action.payload.name;
      state.email = action.payload.email || "";
      state.token = action.payload.token || null;
      localStorage.setItem("vetty-session", JSON.stringify(state));
    },
    logout() {
      localStorage.removeItem("vetty-session");
      return emptyState;
    },
  },
});
export const { login, logout } = authSlice.actions;
export default authSlice.reducer;
