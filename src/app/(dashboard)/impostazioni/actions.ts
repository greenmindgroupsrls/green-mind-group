"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProfileState = {
  error: string | null;
  success: boolean;
};

function orNull(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "").trim();
  return s === "" ? null : s;
}

export async function updateProfile(
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();

  if (!firstName) return { error: "Nome obbligatorio", success: false };
  if (!lastName) return { error: "Cognome obbligatorio", success: false };

  const supabase = await createClient();

  const { error: nameError } = await supabase.rpc("update_own_profile", {
    p_first_name: firstName,
    p_last_name: lastName,
  });
  if (nameError) return { error: nameError.message, success: false };

  const { error: profileError } = await supabase.rpc("upsert_own_profile", {
    p_account_type: orNull(formData.get("account_type")),
    p_date_of_birth: orNull(formData.get("date_of_birth")),
    p_phone_country_code: orNull(formData.get("phone_country_code")),
    p_phone_number: orNull(formData.get("phone_number")),
    p_personal_domain: orNull(formData.get("personal_domain")),
    p_tax_id: orNull(formData.get("tax_id")),
    p_currency: orNull(formData.get("currency")),
    p_timezone: orNull(formData.get("timezone")),
    p_company_name: orNull(formData.get("company_name")),
    p_sdi_code: orNull(formData.get("sdi_code")),
  });
  if (profileError) return { error: profileError.message, success: false };

  const country = orNull(formData.get("country"));
  if (country) {
    const { error: countryError } = await supabase.rpc("set_own_country", {
      p_country: country,
    });
    if (countryError) return { error: countryError.message, success: false };
  }

  revalidatePath("/impostazioni");
  return { error: null, success: true };
}
