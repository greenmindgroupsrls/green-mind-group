"use client";

import { setOrderStatus } from "./actions";
import { SHOP_ORDER_STATUS_LABEL, type ShopOrderStatus } from "@/lib/shop-orders";

const OPTIONS: ShopOrderStatus[] = ["pending", "shipped", "delivered", "cancelled"];

export function OrderStatusSelect({ id, status }: { id: number; status: ShopOrderStatus }) {
  return (
    <select
      defaultValue={status}
      onChange={(e) => setOrderStatus(id, e.target.value as ShopOrderStatus)}
      className="h-9 glass-input px-2.5 text-xs"
    >
      {OPTIONS.map((opt) => (
        <option key={opt} value={opt}>
          {SHOP_ORDER_STATUS_LABEL[opt]}
        </option>
      ))}
    </select>
  );
}
