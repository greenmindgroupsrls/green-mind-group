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

export async function updateCompensationSettings(
  _prevState: CompensationSettingsState,
  formData: FormData,
): Promise<CompensationSettingsState> {
  try {
    await requireRoot();
  } catch {
    return { error: "Non autorizzato", success: false };
  }

  const level0 = Number(formData.get("level0_rate"));
  const level1 = Number(formData.get("level1_rate"));
  const level2 = Number(formData.get("level2_rate"));
  const level3 = Number(formData.get("level3_rate"));

  if ([level0, level1, level2, level3].some((v) => Number.isNaN(v) || v < 0)) {
    return { error: "Tariffe non valide", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_compensation_settings", {
    p_level0_rate: level0,
    p_level1_rate: level1,
    p_level2_rate: level2,
    p_level3_rate: level3,
  });

  if (error) return { error: error.message, success: false };

  revalidatePath("/centro-di-controllo");
  return { error: null, success: true };
}

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

  const diretta = Number(formData.get("plan2_direct_rate"));
  const passUp = Number(formData.get("plan2_passup_rate"));
  const pool = Number(formData.get("plan2_pool_rate"));
  const quota = Number(formData.get("plan2_passup_quota"));
  const royalDiretti = Number(formData.get("plan2_royal_directs"));

  if ([diretta, passUp, pool].some((v) => Number.isNaN(v) || v < 0)) {
    return { error: "Tariffe non valide", success: false };
  }
  if (!Number.isInteger(quota) || quota < 0) {
    return { error: "Il numero di vendite da cedere non è valido", success: false };
  }
  if (!Number.isInteger(royalDiretti) || royalDiretti < 1) {
    return { error: "Servono almeno 1 VIP diretto per la qualifica Royal", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_plan2_settings", {
    p_direct_rate: diretta,
    p_passup_rate: passUp,
    p_pool_rate: pool,
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
