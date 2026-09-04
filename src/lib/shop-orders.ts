export type ShopOrderStatus = "pending" | "paid" | "shipped" | "delivered" | "cancelled";

// "paid" non si sceglie dal menu degli stati: e' il momento in cui nascono
// le provvigioni e passa dal pulsante di conferma pagamento. Gli altri
// stati restano modificabili a mano.
export const STATI_MODIFICABILI_A_MANO: ShopOrderStatus[] = [
  "pending",
  "shipped",
  "delivered",
  "cancelled",
];

export type ShopOrder = {
  id: number;
  buyer_code: number;
  sale_id: number | null;
  status: ShopOrderStatus;
  paid_at: string | null;
  total_amount: number;
  recipient_name: string;
  street: string;
  city: string;
  region: string | null;
  country: string;
  postal_code: string;
  phone: string | null;
  created_at: string;
};

export type ShopOrderItem = {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export const SHOP_ORDER_STATUS_LABEL: Record<ShopOrderStatus, string> = {
  pending: "In attesa di pagamento",
  paid: "Pagato",
  shipped: "Spedito",
  delivered: "Consegnato",
  cancelled: "Annullato",
};

export const SHOP_ORDER_STATUS_BADGE_CLASS: Record<ShopOrderStatus, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  paid: "bg-accent/15 text-accent",
  shipped: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  delivered: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
};
