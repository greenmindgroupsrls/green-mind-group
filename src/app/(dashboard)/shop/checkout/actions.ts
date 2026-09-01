"use server";

import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/current-member";
import { formatActivityCode } from "@/lib/activity-code";
import { sendNewShopOrderNotification } from "@/lib/email";

export type CheckoutItem = { product_id: number; quantity: number };

export type CheckoutState = {
  error: string | null;
  success: { orderId: number } | null;
};

export async function placeOrder(
  _prevState: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  let items: CheckoutItem[];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { error: "Carrello non valido", success: null };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { error: "Il carrello è vuoto", success: null };
  }

  const recipientName = String(formData.get("recipient_name") ?? "").trim();
  const street = String(formData.get("street") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const postalCode = String(formData.get("postal_code") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!recipientName) return { error: "Nome destinatario obbligatorio", success: null };
  if (!street) return { error: "Indirizzo obbligatorio", success: null };
  if (!city) return { error: "Città obbligatoria", success: null };
  if (!country) return { error: "Paese obbligatorio", success: null };
  if (!postalCode) return { error: "CAP obbligatorio", success: null };

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .rpc("create_shop_order", {
      p_items: items,
      p_recipient_name: recipientName,
      p_street: street,
      p_city: city,
      p_region: region || null,
      p_country: country,
      p_postal_code: postalCode,
      p_phone: phone || null,
    })
    .single();

  if (error || !order) {
    return { error: error?.message ?? "Errore nella creazione dell'ordine", success: null };
  }

  const orderRow = order as { id: number; total_amount: number };

  const member = await getCurrentMember();
  if (member && member.activity_code !== 0) {
    const { data: root } = await supabase.from("members").select("email").eq("activity_code", 0).single();
    if (root?.email) {
      await sendNewShopOrderNotification({
        to: root.email,
        memberName: member.username,
        memberCode: formatActivityCode(member.activity_code),
        orderId: orderRow.id,
        totalAmount: orderRow.total_amount,
      });
    }
  }

  // L'ordine genera una vendita/commissioni reali (register_sale interno a
  // create_shop_order): invalida la cache di rete come ogni altra azione
  // che tocca members/sales/commission_entries.
  revalidateTag("network-data", { expire: 0 });

  return { error: null, success: { orderId: orderRow.id } };
}
