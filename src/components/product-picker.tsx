"use client";

import type { Product } from "@/lib/products";

// Quale modello e' stato venduto. Serve da quando le provvigioni sono
// percentuali: i due Vortix costano diverso, quindi il 16% vale importi
// diversi e senza questo dato il sistema non saprebbe quale applicare.
export function ProductPicker({
  products,
  className,
  labelClassName,
}: {
  products: Product[];
  className: string;
  labelClassName: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClassName}>Prodotto venduto</span>
      <select name="product_id" required defaultValue={products[0]?.id ?? ""} className={className}>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} — {Number(p.price).toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
          </option>
        ))}
      </select>
    </label>
  );
}
