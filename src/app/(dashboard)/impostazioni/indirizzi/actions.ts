"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AddressState = {
  error: string | null;
};

export async function addAddress(
  _prevState: AddressState,
  formData: FormData,
): Promise<AddressState> {
  const recipientName = String(formData.get("recipient_name") ?? "").trim();
  const street = String(formData.get("street") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const postalCode = String(formData.get("postal_code") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const type = String(formData.get("type") ?? "shipping");

  if (!recipientName || !street || !city || !country || !postalCode) {
    return { error: "Compila tutti i campi obbligatori" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_own_address", {
    p_recipient_name: recipientName,
    p_street: street,
    p_city: city,
    p_region: region || null,
    p_country: country,
    p_postal_code: postalCode,
    p_phone: phone || null,
    p_type: type,
  });

  if (error) return { error: error.message };

  revalidatePath("/impostazioni/indirizzi");
  return { error: null };
}

export async function deleteAddress(id: number) {
  const supabase = await createClient();
  await supabase.rpc("delete_own_address", { p_id: id });
  revalidatePath("/impostazioni/indirizzi");
}
