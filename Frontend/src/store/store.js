import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import catalogReducer from "./slices/catalogSlice";
import cartReducer from "./slices/cartSlice";
import ordersReducer from "./slices/ordersSlice";
import checkoutReducer from "./slices/checkoutSlice";
import uiReducer from "./slices/uiSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    catalog: catalogReducer,
    cart: cartReducer,
    orders: ordersReducer,
    checkout: checkoutReducer,
    ui: uiReducer,
  },
});
