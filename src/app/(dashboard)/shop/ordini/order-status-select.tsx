"use client";

import { setOrderStatus } from "./actions";
import {
  SHOP_ORDER_STATUS_LABEL,
  STATI_MODIFICABILI_A_MANO,
  type ShopOrderStatus,
} from "@/lib/shop-orders";

export function OrderStatusSelect({
  id,
  status,
  pagato,
}: {
  id: number;
  status: ShopOrderStatus;
  pagato: boolean;
}) {
  return (
    <select
      defaultValue={status === "paid" ? "pending" : status}
      onChange={(e) => setOrderStatus(id, e.target.value as ShopOrderStatus)}
      className="h-9 glass-input px-2.5 text-xs"
    >
      {STATI_MODIFICABILI_A_MANO.map((opt) => (
        <option
          key={opt}
          value={opt}
          // Un ordine gia' pagato non puo' tornare in attesa: le
          // provvigioni sono uscite.
          disabled={pagato && opt === "pending"}
        >
          {SHOP_ORDER_STATUS_LABEL[opt]}
        </option>
      ))}
    </select>
  );
}
