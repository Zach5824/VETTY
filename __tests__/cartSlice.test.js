import cartReducer, { addToCart, setQty, removeFromCart, clearCart } from "../store/slices/cartSlice";

describe("cartSlice", () => {
  const initialState = { items: [] };

  it("adds a new product to an empty cart", () => {
    const state = cartReducer(initialState, addToCart({ id: "p1", qty: 2 }));
    expect(state.items).toEqual([{ productId: "p1", qty: 2 }]);
  });

  it("increments quantity when the same product is added again", () => {
    const withItem = { items: [{ productId: "p1", qty: 2 }] };
    const state = cartReducer(withItem, addToCart({ id: "p1", qty: 1 }));
    expect(state.items[0].qty).toBe(3);
  });

  it("removes an item once its quantity drops to zero", () => {
    const withItem = { items: [{ productId: "p1", qty: 1 }] };
    const state = cartReducer(withItem, setQty({ id: "p1", delta: -1 }));
    expect(state.items).toEqual([]);
  });

  it("removes an item directly", () => {
    const withItem = { items: [{ productId: "p1", qty: 1 }] };
    const state = cartReducer(withItem, removeFromCart("p1"));
    expect(state.items).toEqual([]);
  });

  it("clears the whole cart", () => {
    const withItems = { items: [{ productId: "p1", qty: 1 }, { productId: "p2", qty: 3 }] };
    const state = cartReducer(withItems, clearCart());
    expect(state.items).toEqual([]);
  });
});
