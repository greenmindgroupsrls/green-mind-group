"use server";

import { createClient } from "@/lib/supabase/server";
import { messaggioErrore } from "@/i18n/errori";
import { getDizionario } from "@/i18n/dizionario";

export type PasswordState = {
  error: string | null;
  success: boolean;
};

export async function changePassword(
  _prevState: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { error: "La password deve avere almeno 8 caratteri", success: false };
  }
  if (password !== confirm) {
    return { error: "Le due password non coincidono", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: messaggioErrore(error, await getDizionario()), success: false };

  return { error: null, success: true };
}
