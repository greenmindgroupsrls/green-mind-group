"use client";

import Link from "next/link";
import { ShoppingCart, ClipboardList } from "lucide-react";
import { useCart } from "@/lib/cart-context";

export function ShopHeader({ isRoot = false }: { isRoot?: boolean }) {
  const { count } = useCart();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Shop</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">I prodotti Green Mind Group.</p>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/shop/ordini"
          className="flex items-center gap-2 glass-btn-soft rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
        >
          <ClipboardList size={18} />
          {isRoot ? "Ordini" : "I tuoi ordini"}
        </Link>
        <Link
          href="/shop/cart"
          className="relative flex items-center gap-2 glass-btn-soft rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
        >
          <ShoppingCart size={18} />
          Carrello
          {count > 0 && (
            <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-[var(--accent)] text-[var(--accent-fg)] text-[11px] font-semibold flex items-center justify-center">
              {count}
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}
