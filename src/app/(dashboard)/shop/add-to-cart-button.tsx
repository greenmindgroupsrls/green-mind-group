"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import type { Product } from "@/lib/products";

export function AddToCartButton({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleClick() {
    addItem({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image_path: product.image_path,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="mt-4 w-full glass-btn-primary rounded-lg px-4 py-2.5 text-sm font-medium text-white"
    >
      {added ? "Aggiunto ✓" : "Aggiungi al carrello"}
    </button>
  );
}
