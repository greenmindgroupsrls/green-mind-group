"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/current-member";
import type { Rank } from "@/lib/rank";

async function requireRoot() {
  const member = await getCurrentMember();
  if (!member || member.activity_code !== 0) {
    throw new Error("Non autorizzato");
  }
  return member;
}

export type ProfileState = { error: string | null; success: boolean };

export async function updateMemberProfile(
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  try {
    await requireRoot();
  } catch {
    return { error: "Non autorizzato", success: false };
  }

  const targetCode = Number(formData.get("target_code"));
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const phoneCountryCode = String(formData.get("phone_country_code") ?? "").trim();
  const phoneNumber = String(formData.get("phone_number") ?? "").trim();
  const taxId = String(formData.get("tax_id") ?? "").trim();
  const companyName = String(formData.get("company_name") ?? "").trim();
  const accountType = String(formData.get("account_type") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();

  if (!targetCode) return { error: "Membro non valido", success: false };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_member_profile", {
    p_target_code: targetCode,
    p_first_name: firstName || null,
    p_last_name: lastName || null,
    p_phone_country_code: phoneCountryCode || null,
    p_phone_number: phoneNumber || null,
    p_tax_id: taxId || null,
    p_company_name: companyName || null,
    p_account_type: accountType || null,
    p_username: username || null,
  });

  if (error) return { error: error.message, success: false };

  revalidatePath("/centro-di-controllo");
  return { error: null, success: true };
}

export type CompensationSettingsState = { error: string | null; success: boolean };

export async function setMemberRankOverride(targetCode: number, rank: Rank | null) {
  await requireRoot();

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_rank_override", {
    p_target_code: targetCode,
    p_rank: rank,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/centro-di-controllo");
  revalidatePath("/");
  revalidatePath("/albero");
  revalidateTag("network-data", { expire: 0 });
}

export async function suspendMember(targetCode: number, reason: string | null) {
  await requireRoot();

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_suspend_member", {
    p_target_code: targetCode,
    p_reason: reason,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/centro-di-controllo");
}

export async function unsuspendMember(targetCode: number) {
  await requireRoot();

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_unsuspend_member", {
    p_target_code: targetCode,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/centro-di-controllo");
}

export async function updatePlan2Settings(
  _prevState: CompensationSettingsState,
  formData: FormData,
): Promise<CompensationSettingsState> {
  try {
    await requireRoot();
  } catch {
    return { error: "Non autorizzato", success: false };
  }

  const num = (k: string) => Number(String(formData.get(k) ?? "").replace(",", "."));

  const diretta = num("plan2_direct_pct");
  const passUp = num("plan2_passup_pct");
  const royal = num("plan2_royal_pct");
  const upline = num("plan2_upline_pct");
  const iva = num("vat_rate");
  const quota = num("plan2_passup_quota");
  const royalDiretti = num("plan2_royal_directs");

  const percentuali = [diretta, passUp, royal, upline];
  if (percentuali.some((v) => Number.isNaN(v) || v < 0)) {
    return { error: "Percentuali non valide", success: false };
  }
  const somma = percentuali.reduce((a, b) => a + b, 0);
  if (somma > 100) {
    return {
      error: `Le percentuali sommano al ${somma}%: non si può distribuire più del fatturato`,
      success: false,
    };
  }
  if (Number.isNaN(iva) || iva < 0 || iva > 100) {
    return { error: "Aliquota IVA non valida", success: false };
  }
  if (!Number.isInteger(quota) || quota < 0) {
    return { error: "Il numero di vendite da cedere non è valido", success: false };
  }
  if (!Number.isInteger(royalDiretti) || royalDiretti < 1) {
    return { error: "Serve almeno 1 VIP per la qualifica Royal", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_plan2_settings", {
    p_direct_pct: diretta,
    p_passup_pct: passUp,
    p_royal_pct: royal,
    p_upline_pct: upline,
    p_vat_rate: iva,
    p_passup_quota: quota,
    p_royal_directs: royalDiretti,
  });

  if (error) return { error: error.message, success: false };

  revalidatePath("/centro-di-controllo");
  return { error: null, success: true };
}

export type RoyalPoolState = {
  error: string | null;
  esito: { totale: number; quantiRoyal: number; quota: number } | null;
};

// Chiude il Royal Pool: somma quanto accantonato e lo divide fra i Royal.
// E' un'operazione che muove denaro e non si torna indietro, per questo la
// fa partire una persona e non un automatismo a calendario.
export async function settleRoyalPool(
  _prevState: RoyalPoolState,
  _formData: FormData,
): Promise<RoyalPoolState> {
  try {
    await requireRoot();
  } catch {
    return { error: "Non autorizzato", esito: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("liquida_royal_pool").single();

  if (error) return { error: error.message, esito: null };

  const chiusura = data as { total_amount: number; royal_count: number; share: number };
  revalidatePath("/centro-di-controllo");
  return {
    error: null,
    esito: {
      totale: Number(chiusura.total_amount),
      quantiRoyal: chiusura.royal_count,
      quota: Number(chiusura.share),
    },
  };
}

export type ListinoState = { error: string | null; success: boolean };

// Il listino: le provvigioni sono percentuali sull'imponibile, quindi
// cambiando il prezzo si adeguano da sole e non c'e' nessuna tariffa da
// ritoccare. Quelle gia' generate restano come sono state calcolate.
export async function updateProductPrices(
  _prevState: ListinoState,
  formData: FormData,
): Promise<ListinoState> {
  try {
    await requireRoot();
  } catch {
    return { error: "Non autorizzato", success: false };
  }

  const prezzi: { id: number; price: number }[] = [];
  for (const [chiave, valore] of formData.entries()) {
    const m = /^prezzo_(\d+)$/.exec(chiave);
    if (!m) continue;
    const price = Number(String(valore).replace(",", "."));
    if (Number.isNaN(price) || price <= 0) {
      return { error: "I prezzi devono essere maggiori di zero", success: false };
    }
    prezzi.push({ id: Number(m[1]), price });
  }

  if (prezzi.length === 0) {
    return { error: "Nessun prezzo da aggiornare", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_product_prices", { p_prezzi: prezzi });
  if (error) return { error: error.message, success: false };

  revalidatePath("/centro-di-controllo");
  revalidatePath("/shop");
  return { error: null, success: true };
}
