"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type CartItem = {
  id: number;
  slug: string;
  name: string;
  price: number;
  image_path: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (product: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clear: () => void;
  subtotal: number;
  count: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "gmg-cart";

const emptySubscribe = () => () => {};

// Stesso pattern di theme-toggle.tsx: sapere se siamo montati lato client
// senza un useEffect che chiama setState (il React Compiler di questo
// progetto blocca quel pattern — vedi react-hooks/set-state-in-effect).
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loadedFromStorage, setLoadedFromStorage] = useState(false);
  const mounted = useMounted();

  // Il carrello vive solo lato client (localStorage): finché non siamo
  // montati si mostra sempre carrello vuoto (server e primo render client
  // coincidono, nessun mismatch di idratazione), poi si legge una volta
  // sola lo stato salvato — durante il render, non in un effect.
  if (mounted && !loadedFromStorage) {
    setLoadedFromStorage(true);
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // localStorage non disponibile o dati corrotti: si riparte da carrello vuoto
    }
  }

  useEffect(() => {
    if (!loadedFromStorage) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, loadedFromStorage]);

  function addItem(product: Omit<CartItem, "quantity">, quantity = 1) {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i,
        );
      }
      return [...prev, { ...product, quantity }];
    });
  }

  function removeItem(id: number) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function updateQuantity(id: number, quantity: number) {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.id !== id)
        : prev.map((i) => (i.id === id ? { ...i, quantity } : i)),
    );
  }

  function clear() {
    setItems([]);
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clear, subtotal, count }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve essere usato dentro <CartProvider>");
  return ctx;
}
