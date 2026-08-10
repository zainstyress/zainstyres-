import { createContext, useContext, useEffect, useMemo, useState } from "react";

function notify(message) {
  window.dispatchEvent(new CustomEvent("app-toast", { detail: { message } }));
}

const CartContext = createContext(null);
const STORAGE_KEY = "cartItems";

function normalizeItem(tyre) {
  return {
    id: tyre.id,
    name: tyre.name,
    size: tyre.size || tyre.selectedSize || "",
    price: Number(tyre.price) || 0,
    image: tyre.image || tyre.imageUrl || tyre.images?.[0] || "",
    qty: Math.max(1, Number(tyre.qty) || 1),
  };
}

function readCart() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(readCart);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (tyre) => {
    const nextItem = normalizeItem(tyre);

    setCartItems((items) => {
      const existing = items.find((item) => item.id === nextItem.id);

      if (!existing) {
        return [...items, nextItem];
      }

      return items.map((item) =>
        item.id === nextItem.id
          ? { ...item, qty: item.qty + nextItem.qty }
          : item
      );
    });

    notify("Added to bag!");
  };

  const removeFromCart = (tyreId) => {
    setCartItems((items) => items.filter((item) => item.id !== tyreId));
    notify("Removed from bag");
  };

  const updateQty = (tyreId, qty) => {
    const nextQty = Number(qty);

    if (nextQty <= 0) {
      removeFromCart(tyreId);
      return;
    }

    setCartItems((items) =>
      items.map((item) =>
        item.id === tyreId ? { ...item, qty: Math.max(1, nextQty) } : item
      )
    );
  };

  const clearCart = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCartItems([]);
  };

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.qty, 0),
    [cartItems]
  );

  const total = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cartItems]
  );

  const value = useMemo(
    () => ({
      addToCart,
      removeFromCart,
      updateQty,
      clearCart,
      cartItems,
      cartCount,
      total,
    }),
    [cartItems, cartCount, total]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }

  return context;
}
