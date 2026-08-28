import { createSlice } from "@reduxjs/toolkit";

const initialState = { loggedIn: false, role: null, name: "" }; // role: 'customer' | 'admin'

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login(state, action) {
      state.loggedIn = true;
      state.role = action.payload.role;
      state.name = action.payload.name;
    },
    logout() {
      return initialState;
    },
  },
});
export const { login, logout } = authSlice.actions;
export default authSlice.reducer;
