"use client";

import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart-context";

function formatEuro(value: number) {
  return value.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] p-12 text-center">
        <p className="text-gray-400 dark:text-gray-500 mb-4">Il tuo carrello è vuoto.</p>
        <Link href="/shop" className="text-accent font-medium hover:underline">
          Torna al catalogo
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] shadow-sm divide-y divide-gray-100 dark:divide-white/5">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 p-4">
            <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-gray-50 dark:bg-white/5">
              <Image src={item.image_path} alt={item.name} fill sizes="64px" className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {item.name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{formatEuro(item.price)}</p>
            </div>
            <div className="flex items-center rounded-lg border border-gray-300 dark:border-white/10">
              <button
                type="button"
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                className="h-8 w-8 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
              >
                <Minus size={14} />
              </button>
              <span className="w-8 text-center text-sm font-medium text-gray-900 dark:text-white">
                {item.quantity}
              </span>
              <button
                type="button"
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                className="h-8 w-8 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
              >
                <Plus size={14} />
              </button>
            </div>
            <p className="w-24 text-right text-sm font-semibold text-gray-900 dark:text-white">
              {formatEuro(item.price * item.quantity)}
            </p>
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
              aria-label="Rimuovi"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] shadow-sm p-6 h-fit">
        <div className="flex items-center justify-between text-sm mb-4">
          <span className="text-gray-500 dark:text-gray-400">Subtotale</span>
          <span className="font-semibold text-gray-900 dark:text-white">{formatEuro(subtotal)}</span>
        </div>
        <Link
          href="/shop/checkout"
          className="block text-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          Procedi al checkout
        </Link>
      </div>
    </div>
  );
}
