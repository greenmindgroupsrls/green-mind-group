"use server";

import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { runCompleteRegistration, notifySponsorOfNewReferral } from "@/lib/complete-registration";
import { parseActivityCode } from "@/lib/activity-code";
import { SITE_URL } from "@/lib/email";

export type LoginState = {
  error: string | null;
};

export async function signIn(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!email || !password) {
    return { error: "Email e password sono obbligatorie" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Credenziali non valide" };
  }

  redirect(next.startsWith("/") ? next : "/");
}

export type SignUpState = {
  error: string | null;
  checkEmail: boolean;
};

export async function signUp(
  _prevState: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const autoAssign = formData.get("auto_assign") === "on";
  const refCodeRaw = String(formData.get("ref_code") ?? "").trim();
  const refCode = refCodeRaw === "" ? null : parseActivityCode(refCodeRaw);
  const termsAccepted = formData.get("terms") === "on";
  // Campo honeypot: invisibile per un utente reale, i bot che compilano ogni
  // campo del form ci cascano. Se arriva valorizzato, va ignorata la
  // richiesta senza dare nessun indizio al chiamante (finto successo).
  if (String(formData.get("website") ?? "").trim() !== "") {
    return { error: null, checkEmail: true };
  }
  const role = String(formData.get("role") ?? "cliente") === "incaricato" ? "incaricato" : "cliente";
  const accountType = String(formData.get("account_type") ?? "individual") === "company" ? "company" : "individual";
  const taxId = String(formData.get("tax_id") ?? "").trim();
  const companyName = String(formData.get("company_name") ?? "").trim();

  if (!firstName) return { error: "Nome obbligatorio", checkEmail: false };
  if (!lastName) return { error: "Cognome obbligatorio", checkEmail: false };
  if (!email) return { error: "Email obbligatoria", checkEmail: false };
  if (password.length < 8) {
    return { error: "La password deve avere almeno 8 caratteri", checkEmail: false };
  }
  if (!autoAssign && refCode === null) {
    return { error: "Inserisci il codice ref, oppure seleziona \"non ho un ref\"", checkEmail: false };
  }
  if (accountType === "company" && !companyName) {
    return { error: "Ragione sociale obbligatoria per un'azienda", checkEmail: false };
  }
  if (accountType === "individual" && !taxId) {
    return { error: "Codice fiscale obbligatorio", checkEmail: false };
  }
  if (!termsAccepted) {
    return { error: "Devi accettare i Termini e Condizioni", checkEmail: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        ref_code: autoAssign ? null : refCode,
        auto_assign: autoAssign,
        role,
        account_type: accountType,
        tax_id: taxId,
        company_name: companyName,
      },
    },
  });

  if (error) {
    return { error: error.message, checkEmail: false };
  }

  if (!data.session) {
    // Conferma email richiesta dalle impostazioni del progetto Supabase:
    // nessuna sessione finché non si conferma. I dati raccolti restano nei
    // metadata dell'utente Auth e vengono usati automaticamente da
    // /registrati/completa al primo accesso dopo la conferma.
    return { error: null, checkEmail: true };
  }

  const { data: newMember, error: registrationError } = await runCompleteRegistration(supabase, {
    firstName,
    lastName,
    refCode: autoAssign ? null : refCode,
    autoAssign,
    role,
    accountType,
    taxId: taxId || null,
    companyName: accountType === "company" ? companyName || null : null,
  });

  if (registrationError) {
    return { error: registrationError.message, checkEmail: false };
  }

  if (newMember) await notifySponsorOfNewReferral(newMember);

  revalidateTag("network-data", { expire: 0 });
  redirect("/");
}

export type RequestResetState = {
  error: string | null;
  sent: boolean;
};

export async function requestPasswordReset(
  _prevState: RequestResetState,
  formData: FormData,
): Promise<RequestResetState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Email obbligatoria", sent: false };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/reset-password`,
  });

  // Messaggio identico in ogni caso, email esistente o meno: non deve
  // essere possibile scoprire quali email sono registrate provando questo
  // modulo.
  return { error: null, sent: true };
}

export type UpdatePasswordState = {
  error: string | null;
};

export async function updatePassword(
  _prevState: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password.length < 8) {
    return { error: "La password deve avere almeno 8 caratteri" };
  }
  if (password !== confirmPassword) {
    return { error: "Le due password non coincidono" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Link scaduto o non valido: richiedi un nuovo link per reimpostare la password",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }

  redirect("/");
}
