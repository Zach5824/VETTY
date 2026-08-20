import { createSlice } from "@reduxjs/toolkit";
import { seedOrders } from "../../data/seed";

const initialState = {
  orders: seedOrders,
  bookings: [],
  reviews: [],
  selectedOrderId: null,
};

const ordersSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    placeOrder: {
      reducer(state, action) {
        state.orders.unshift(action.payload);
        state.selectedOrderId = action.payload.id;
      },
      prepare({ items, total, customer, payment }) {
        const id = "VT-" + Math.floor(10000 + Math.random() * 89999);
        return {
          payload: {
            id, kind: "product",
            label: `${items.length} item${items.length > 1 ? "s" : ""}`,
            total, status: "pending", customer, when: "just now", payment, items,
          },
        };
      },
    },
    placeBooking: {
      reducer(state, action) {
        state.bookings.unshift(action.payload);
        state.selectedOrderId = action.payload.id;
      },
      prepare({ serviceId, serviceName, petName, date, time, notes, price, customer }) {
        const id = "BK-" + Math.floor(1000 + Math.random() * 8999);
        return { payload: { id, serviceId, serviceName, petName, date, time, notes, status: "pending", price, customer } };
      },
    },
    approveOrder(state, action) {
      const o = state.orders.find((x) => x.id === action.payload);
      if (o) o.status = "approved";
    },
    rejectOrder(state, action) {
      const o = state.orders.find((x) => x.id === action.payload);
      if (o) o.status = "rejected";
    },
    approveBooking(state, action) {
      const b = state.bookings.find((x) => x.id === action.payload);
      if (b) b.status = "approved";
    },
    rejectBooking(state, action) {
      const b = state.bookings.find((x) => x.id === action.payload);
      if (b) b.status = "rejected";
    },
    submitReview(state, action) {
      state.reviews.push(action.payload);
    },
    setSelectedOrder(state, action) {
      state.selectedOrderId = action.payload;
    },
  },
});

export const {
  placeOrder, placeBooking, approveOrder, rejectOrder,
  approveBooking, rejectBooking, submitReview, setSelectedOrder,
} = ordersSlice.actions;
export default ordersSlice.reducer;
