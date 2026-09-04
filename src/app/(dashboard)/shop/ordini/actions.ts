"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendOrderStatusEmail } from "@/lib/email";
import type { ShopOrder, ShopOrderStatus } from "@/lib/shop-orders";

export async function setOrderStatus(id: number, status: ShopOrderStatus) {
  const supabase = await createClient();
  const { data: orderRaw } = await supabase
    .rpc("set_shop_order_status", { p_id: id, p_status: status })
    .single();
  const order = orderRaw as ShopOrder | null;

  // Il chiamante e' l'azienda (root), che vede tutti i members via RLS:
  // nessun bisogno del client admin qui.
  if (order) {
    const { data: buyer } = await supabase
      .from("members")
      .select("email")
      .eq("activity_code", order.buyer_code)
      .maybeSingle();

    if (buyer?.email) {
      await sendOrderStatusEmail({ to: buyer.email, orderId: order.id, status });
    }
  }

  revalidatePath("/shop/ordini");
}

// La conferma del pagamento e' il momento in cui nascono le provvigioni:
// diretta allo sponsor di chi ha comprato, pass-up, indennizzo e quota
// Royal. Oggi la da' l'azienda a mano; quando ci sara' il sistema di
// pagamento chiamera' la stessa funzione del database e qui non cambiera'
// nulla.
export async function confirmOrderPayment(id: number) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("conferma_pagamento_ordine", { p_order_id: id });
  if (error) throw new Error(error.message);

  // Le provvigioni appena create cambiano i dati di rete.
  revalidateTag("network-data", { expire: 0 });
  revalidatePath("/shop/ordini");
}
