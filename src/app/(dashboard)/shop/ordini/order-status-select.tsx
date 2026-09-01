"use client";

import { setOrderStatus } from "./actions";
import { SHOP_ORDER_STATUS_LABEL, type ShopOrderStatus } from "@/lib/shop-orders";

const OPTIONS: ShopOrderStatus[] = ["pending", "shipped", "delivered", "cancelled"];

export function OrderStatusSelect({ id, status }: { id: number; status: ShopOrderStatus }) {
  return (
    <select
      defaultValue={status}
      onChange={(e) => setOrderStatus(id, e.target.value as ShopOrderStatus)}
      className="h-9 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
    >
      {OPTIONS.map((opt) => (
        <option key={opt} value={opt}>
          {SHOP_ORDER_STATUS_LABEL[opt]}
        </option>
      ))}
    </select>
  );
}
