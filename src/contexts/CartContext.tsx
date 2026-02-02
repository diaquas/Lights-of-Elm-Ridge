"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useSyncExternalStore,
} from "react";

export interface CartItem {
  id: number;
  slug: string;
  title: string;
  artist: string;
  price: number;
  category: "Halloween" | "Christmas";
  thumbnailUrl: string | null;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: number) => void;
  clearCart: () => void;
  isInCart: (id: number) => boolean;
  itemCount: number;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "lightsofelmridge-cart";

// Store for triggering re-renders when cart changes
let listeners: Array<() => void> = [];

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getCartItems(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

function getSnapshot(): string {
  if (typeof window === "undefined") return "[]";
  return localStorage.getItem(CART_STORAGE_KEY) || "[]";
}

function getServerSnapshot(): string {
  return "[]";
}

function setStoredCart(items: CartItem[]) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    emitChange();
  } catch (error) {
    console.error("Failed to save cart to localStorage:", error);
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  // Use useSyncExternalStore to sync with localStorage
  const storedValue = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const items: CartItem[] = JSON.parse(storedValue);

  // These functions read directly from localStorage to get current state
  const addItem = useCallback((item: CartItem) => {
    const current = getCartItems();
    // Don't add duplicates
    if (current.some((i) => i.id === item.id)) {
      return;
    }
    setStoredCart([...current, item]);
  }, []);

  const removeItem = useCallback((id: number) => {
    const current = getCartItems();
    setStoredCart(current.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setStoredCart([]);
  }, []);

  const isInCart = useCallback(
    (id: number) => items.some((item) => item.id === id),
    [items],
  );

  const itemCount = items.length;

  const total = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        clearCart,
        isInCart,
        itemCount,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
