import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "./supabase/admin";
import { formatActivityCode } from "./activity-code";
import { sendNewReferralEmail } from "./email";

export type RegistrationProfile = {
  firstName: string;
  lastName: string;
  refCode: number | null;
  autoAssign: boolean;
  role: "cliente" | "incaricato";
  accountType: "individual" | "company";
  taxId: string | null;
  companyName: string | null;
};

type NewMemberRow = {
  activity_code: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  ref_sponsor_code: number | null;
};

// Chiama complete_registration() con i dati raccolti al signup (email+password,
// via user_metadata) o al popup post-Google. Condivisa tra login/actions.ts
// (caso "sessione immediata dopo signUp") e registrati/completa (caso
// "sessione arrivata dopo conferma email, o dopo OAuth Google").
export async function runCompleteRegistration(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  profile: RegistrationProfile,
) {
  const { data, error } = await supabase
    .rpc("complete_registration", {
      p_first_name: profile.firstName,
      p_last_name: profile.lastName,
      p_ref_code: profile.refCode,
      p_auto_assign: profile.autoAssign,
      p_role: profile.role,
      p_account_type: profile.accountType,
      p_tax_id: profile.taxId,
      p_company_name: profile.companyName,
    })
    .single();

  return { data: data as NewMemberRow | null, error };
}

// Avvisa lo sponsor (via email E via messaggio in app, stesso inbox che
// alimenta il numero sulla campanella) che qualcuno si è appena iscritto
// con il suo codice — serve soprattutto per l'auto-registrazione/OAuth,
// dove lo sponsor non è chi ha compiuto l'azione e altrimenti non se ne
// accorgerebbe. Usa il client admin perché lo sponsor è tipicamente un
// antenato del nuovo iscritto: la RLS (is_self_or_descendant) impedirebbe
// al nuovo iscritto di leggere/scrivere la riga dello sponsor con il
// proprio client. Best-effort: se manca la service role key o un invio
// fallisce, non deve mai bloccare la registrazione.
export async function notifySponsorOfNewReferral(newMember: NewMemberRow) {
  if (newMember.ref_sponsor_code === null) return;

  const admin = createAdminClient();
  const newMemberName =
    newMember.first_name && newMember.last_name
      ? `${newMember.first_name} ${newMember.last_name}`
      : newMember.username;

  let sponsor: { username: string; email: string | null } | null = null;
  try {
    const { data } = await admin
      .from("members")
      .select("username, email")
      .eq("activity_code", newMember.ref_sponsor_code)
      .maybeSingle();
    sponsor = data;
  } catch {
    // best-effort: niente service role key configurata, o lookup fallito
  }

  if (sponsor?.email) {
    try {
      await sendNewReferralEmail({
        to: sponsor.email,
        sponsorName: sponsor.username,
        newMemberName,
        newMemberCode: formatActivityCode(newMember.activity_code),
      });
    } catch {
      // best-effort: invio email fallito, non deve bloccare la registrazione
    }
  }

  if (sponsor?.username) {
    try {
      await admin.from("messages").insert({
        sender_code: newMember.activity_code,
        sender_username: newMember.username,
        recipient_code: newMember.ref_sponsor_code,
        recipient_username: sponsor.username,
        subject: "Nuovo iscritto nella tua rete",
        body: `${newMemberName} (${formatActivityCode(newMember.activity_code)}) si è appena iscritto usando il tuo codice.`,
      });
    } catch {
      // best-effort: non deve mai bloccare la registrazione
    }
  }
}
