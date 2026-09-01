"use server";

import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { runCompleteRegistration, notifySponsorOfNewReferral } from "@/lib/complete-registration";
import { parseActivityCode } from "@/lib/activity-code";

export type CompleteRegistrationState = {
  error: string | null;
};

export async function completeRegistration(
  _prevState: CompleteRegistrationState,
  formData: FormData,
): Promise<CompleteRegistrationState> {
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const autoAssign = formData.get("auto_assign") === "on";
  const refCodeRaw = String(formData.get("ref_code") ?? "").trim();
  const refCode = refCodeRaw === "" ? null : parseActivityCode(refCodeRaw);
  const termsAccepted = formData.get("terms") === "on";
  const role = String(formData.get("role") ?? "cliente") === "incaricato" ? "incaricato" : "cliente";
  const accountType = String(formData.get("account_type") ?? "individual") === "company" ? "company" : "individual";
  const taxId = String(formData.get("tax_id") ?? "").trim();
  const companyName = String(formData.get("company_name") ?? "").trim();

  if (!firstName) return { error: "Nome obbligatorio" };
  if (!lastName) return { error: "Cognome obbligatorio" };
  if (!autoAssign && refCode === null) {
    return { error: 'Inserisci il codice ref, oppure seleziona "non ho un ref"' };
  }
  if (accountType === "company" && !companyName) {
    return { error: "Ragione sociale obbligatoria per un'azienda" };
  }
  if (accountType === "individual" && !taxId) {
    return { error: "Codice fiscale obbligatorio" };
  }
  if (!termsAccepted) {
    return { error: "Devi accettare i Termini e Condizioni" };
  }

  const supabase = await createClient();
  const { data: newMember, error } = await runCompleteRegistration(supabase, {
    firstName,
    lastName,
    refCode: autoAssign ? null : refCode,
    autoAssign,
    role,
    accountType,
    taxId: taxId || null,
    companyName: accountType === "company" ? companyName || null : null,
  });

  if (error) {
    return { error: error.message };
  }

  if (newMember) await notifySponsorOfNewReferral(newMember);

  revalidateTag("network-data", { expire: 0 });
  redirect("/");
}
