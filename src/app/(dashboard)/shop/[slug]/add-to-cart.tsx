"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import type { Product } from "@/lib/products";

export function AddToCart({ product }: { product: Product }) {
  const { addItem } = useCart();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  function snapshot() {
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image_path: product.image_path,
    };
  }

  function handleAdd() {
    addItem(snapshot(), quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  function handleBuyNow() {
    addItem(snapshot(), quantity);
    router.push("/shop/checkout");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Quantità</span>
        <div className="flex items-center rounded-lg border border-gray-300 dark:border-white/10">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="h-10 w-10 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
          >
            −
          </button>
          <span className="w-10 text-center text-sm font-medium text-gray-900 dark:text-white">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            className="h-10 w-10 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-lg border border-accent text-accent px-5 py-2.5 text-sm font-medium hover:bg-accent/5 transition-colors"
        >
          {added ? "Aggiunto ✓" : "Aggiungi al carrello"}
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          className="glass-btn-primary rounded-lg px-5 py-2.5 text-sm font-medium"
        >
          Acquista ora
        </button>
      </div>
    </div>
  );
}
