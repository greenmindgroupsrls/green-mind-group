"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentMember } from "@/lib/current-member";

export type CommissionEntryResult = {
  beneficiary_code: number;
  level: number;
  amount: number;
};

export type EnrollState = {
  error: string | null;
  success: {
    activity_code: number;
    username: string;
    sale_id: number;
    entries: CommissionEntryResult[];
  } | null;
};

function usernameBaseFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "utente";
  const cleaned = local.toLowerCase().replace(/[^a-z0-9_.]/g, "");
  return cleaned || "utente";
}

export async function enrollMemberWithSale(
  _prevState: EnrollState,
  formData: FormData,
): Promise<EnrollState> {
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const country = String(formData.get("country") ?? "").trim();
  const accountType = String(formData.get("account_type") ?? "individual");
  const companyName = String(formData.get("company_name") ?? "").trim();
  const taxId = String(formData.get("tax_id") ?? "").trim();
  const isNationalVatId = formData.get("is_national_vat_id") === "on";
  const termsAccepted = formData.get("terms") === "on";
  const role = String(formData.get("role") ?? "cliente") === "incaricato" ? "incaricato" : "cliente";
  const quantity = 1;
  // Il modello acquistato: le provvigioni sono percentuali sul suo
  // imponibile, quindi va scelto anche in fase di iscrizione.
  const productId = Number(String(formData.get("product_id") ?? "").trim());
  if (!Number.isInteger(productId) || productId <= 0) {
    return { error: "Scegli il prodotto acquistato", success: null };
  }

  if (!firstName) return { error: "Nome obbligatorio", success: null };
  if (!lastName) return { error: "Cognome obbligatorio", success: null };
  if (!email) return { error: "Email obbligatoria", success: null };
  if (password.length < 8) {
    return { error: "La password deve avere almeno 8 caratteri", success: null };
  }
  if (!country) return { error: "Paese obbligatorio", success: null };
  if (accountType === "company" && !companyName) {
    return { error: "Ragione sociale obbligatoria per un'azienda", success: null };
  }
  if (accountType === "individual" && !taxId) {
    return { error: "Codice fiscale obbligatorio", success: null };
  }
  if (!termsAccepted) {
    return { error: "Devi accettare i Termini e Condizioni", success: null };
  }

  const sponsor = await getCurrentMember();
  if (!sponsor) {
    return { error: "Devi essere autenticato per iscrivere un nuovo membro", success: null };
  }

  const admin = createAdminClient();
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authUser.user) {
    return { error: authError?.message ?? "Impossibile creare l'account", success: null };
  }

  const supabase = await createClient();

  const base = usernameBaseFromEmail(email);
  let newMember: { activity_code: number; username: string } | null = null;
  let enrollError: { message: string } | null = null;

  for (let attempt = 0; attempt <= 20; attempt++) {
    const candidate = attempt === 0 ? base : `${base}${attempt}`;
    const { data, error } = await supabase
      .rpc("enroll_member", { p_username: candidate, p_ref_code: sponsor.activity_code, p_role: role })
      .single();

    if (!error && data) {
      newMember = data as { activity_code: number; username: string };
      enrollError = null;
      break;
    }

    enrollError = error;
    const isDuplicateUsername =
      error?.code === "23505" || (error?.message ?? "").toLowerCase().includes("duplicate");
    if (!isDuplicateUsername) break;
  }

  if (!newMember) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    return { error: enrollError?.message ?? "Iscrizione fallita", success: null };
  }

  const { error: linkError } = await admin
    .from("members")
    .update({ auth_user_id: authUser.user.id, email, first_name: firstName, last_name: lastName })
    .eq("activity_code", newMember.activity_code);

  if (linkError) {
    return { error: `Iscritto creato ma account non collegato: ${linkError.message}`, success: null };
  }

  await admin.from("member_countries").upsert({
    activity_code: newMember.activity_code,
    country,
  });

  await admin.from("member_profiles").upsert({
    activity_code: newMember.activity_code,
    account_type: accountType,
    company_name: accountType === "company" ? companyName || null : null,
    tax_id: taxId || null,
    is_national_vat_id: accountType === "company" ? isNationalVatId : false,
  });

  // Chi ha comprato serve al nuovo piano compensi: sulle prime due vendite di
  // ciascuno, l'acquirente viene ereditato dal VIP superiore ed e' quello a
  // far scattare il pass-up. Senza questo dato la vendita paga solo la
  // provvigione diretta.
  const { data: sale, error: saleError } = await supabase
    .rpc("register_sale", {
      p_seller_code: sponsor.activity_code,
      p_quantity: quantity,
      p_buyer_code: newMember.activity_code,
      p_product_id: productId,
    })
    .single();

  if (saleError || !sale) {
    return {
      error: `Iscritto creato ma vendita non registrata: ${saleError?.message ?? "errore sconosciuto"}. Puoi registrarla da "Registrazione" → "Cliente esistente".`,
      success: null,
    };
  }

  const saleRow = sale as { id: number };
  const { data: entries } = await supabase
    .from("commission_entries")
    .select("beneficiary_code, level, amount")
    .eq("sale_id", saleRow.id);

  revalidatePath("/albero");
  revalidatePath("/");
  revalidateTag("network-data", { expire: 0 });

  return {
    error: null,
    success: {
      activity_code: newMember.activity_code,
      username: newMember.username,
      sale_id: saleRow.id,
      entries: (entries ?? []).sort((a, b) => a.level - b.level),
    },
  };
}
