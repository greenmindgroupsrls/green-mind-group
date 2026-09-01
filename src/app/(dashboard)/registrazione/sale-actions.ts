"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/current-member";

export type CommissionEntryResult = {
  beneficiary_code: number;
  beneficiary_username: string;
  level: number;
  amount: number;
};

export type RegisterSaleState = {
  error: string | null;
  success: {
    sale_id: number;
    seller_code: number;
    quantity: number;
    entries: CommissionEntryResult[];
  } | null;
};

export async function registerSale(
  _prevState: RegisterSaleState,
  formData: FormData,
): Promise<RegisterSaleState> {
  const quantity = Number(String(formData.get("quantity") ?? "").trim());
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { error: "Quantità non valida", success: null };
  }

  const caller = await getCurrentMember();
  if (!caller) {
    return { error: "Devi essere autenticato per registrare una vendita", success: null };
  }

  // Solo l'azienda (codice 0) puo' specificare un venditore diverso da se stessa.
  const requestedSellerCode = Number(String(formData.get("seller_code") ?? "").trim());
  const sellerCode =
    caller.activity_code === 0 && Number.isInteger(requestedSellerCode) && requestedSellerCode >= 0
      ? requestedSellerCode
      : caller.activity_code;

  const supabase = await createClient();
  const { data: sale, error: saleError } = await supabase
    .rpc("register_sale", { p_seller_code: sellerCode, p_quantity: quantity })
    .single();

  if (saleError) {
    return { error: saleError.message, success: null };
  }

  const saleRow = sale as { id: number; seller_code: number; quantity: number };

  const { data: entries, error: entriesError } = await supabase
    .from("commission_entries")
    .select("beneficiary_code, level, amount")
    .eq("sale_id", saleRow.id);

  if (entriesError) {
    return { error: entriesError.message, success: null };
  }

  const beneficiaryCodes = [...new Set((entries ?? []).map((e) => e.beneficiary_code))];
  const { data: beneficiaries } = await supabase
    .from("members")
    .select("activity_code, username")
    .in("activity_code", beneficiaryCodes);

  const usernameByCode = new Map(
    (beneficiaries ?? []).map((m) => [m.activity_code, m.username as string]),
  );

  revalidatePath("/");
  revalidateTag("network-data", { expire: 0 });

  return {
    error: null,
    success: {
      sale_id: saleRow.id,
      seller_code: saleRow.seller_code,
      quantity: saleRow.quantity,
      entries: (entries ?? [])
        .map((e) => ({
          beneficiary_code: e.beneficiary_code,
          beneficiary_username: usernameByCode.get(e.beneficiary_code) ?? `#${e.beneficiary_code}`,
          level: e.level,
          amount: e.amount,
        }))
        .sort((a, b) => a.level - b.level),
    },
  };
}
