"use server";

import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { CONTRACT_VERSION } from "@/lib/contract-version";
import { validaIban, validaBic, validaCoerenza } from "@/lib/bank-validation";

export type BecomeIncaricatoState = {
  error: string | null;
};

export async function signIncaricatoContract(
  _prevState: BecomeIncaricatoState,
  formData: FormData,
): Promise<BecomeIncaricatoState> {
  const text = (k: string) => String(formData.get(k) ?? "").trim();
  const checked = (k: string) => formData.get(k) === "on";
  // le dichiarazioni a-d sono scelte SI/NO esplicite, non spunte: una
  // risposta mancante non deve mai passare come "no" implicito
  const choice = (k: string) => {
    const v = formData.get(k);
    return v === "si" ? true : v === "no" ? false : null;
  };

  if (!checked("accetto_contratto")) {
    return { error: "Devi accettare il contratto per continuare" };
  }
  if (!checked("accetto_clausole")) {
    return { error: "Devi approvare specificamente le clausole indicate (artt. 1341-1342 c.c.)" };
  }
  if (!checked("accetto_dichiarazioni")) {
    return { error: "Devi confermare le Dichiarazioni Referente" };
  }

  // a-d: condizioni necessarie all'incarico, non opinioni.
  const obbligatorie: [string, string][] = [
    ["decl_adult", "di essere maggiorenne e capace di agire"],
    ["decl_honorability", "il possesso dei requisiti di onorabilità (Art. 71 D.Lgs. 59/2010)"],
    ["decl_no_compete", "di non essere vincolato da accordi di non concorrenza"],
    ["decl_no_conflict", "l'assenza di conflitti di interesse"],
  ];
  for (const [campo, descrizione] of obbligatorie) {
    if (!checked(campo)) return { error: `Devi dichiarare ${descrizione}` };
  }

  // e-g: scelte con entrambe le risposte valide; una risposta mancante non
  // deve mai passare come "no" implicito.
  const scelte = {
    earned: choice("decl_earned_threshold"),
    unemployed: choice("decl_unemployed"),
    social: choice("decl_social_security"),
    pensioner: choice("decl_pensioner"),
    vat: choice("decl_has_vat"),
    publicEmployee: choice("decl_public_employee"),
  };
  if (Object.values(scelte).some((v) => v === null)) {
    return { error: "Rispondi a tutte le Dichiarazioni Referente" };
  }

  // g: il regime fiscale serve solo a chi ha la partita IVA, ma allora e' obbligatorio.
  const vatRegime = text("decl_vat_regime");
  if (scelte.vat === true && !vatRegime) {
    return { error: "Indica il regime fiscale della tua partita IVA" };
  }

  // h: chi e' dipendente pubblico deve specificare quale dei due casi dell'Art. 53.
  const publicFullTime = choice("decl_public_full_time");
  if (scelte.publicEmployee === true && publicFullTime === null) {
    return {
      error: "Indica se sei part-time al 50% o a tempo pieno con autorizzazione dell'Ente",
    };
  }

  // I riferimenti bancari sono facoltativi, ma se compilati devono essere
  // corretti: finiscono sul contratto firmato.
  const esitoIban = validaIban(text("iban"));
  if (!esitoIban.ok) return { error: `IBAN non valido — ${esitoIban.errore}` };
  const esitoSwift = validaBic(text("swift"));
  if (!esitoSwift.ok) return { error: `Swift non valido — ${esitoSwift.errore}` };
  const esitoCoerenza = validaCoerenza(text("iban"), text("swift"));
  if (!esitoCoerenza.ok) return { error: esitoCoerenza.errore };

  // Prove dell'accettazione: IP e browser di chi ha firmato.
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const signedIp = forwarded ? forwarded.split(",")[0].trim() : h.get("x-real-ip");
  const userAgent = h.get("user-agent");

  const supabase = await createClient();
  const { error } = await supabase.rpc("sign_incaricato_contract", {
    p_birth_place: text("birth_place"),
    p_birth_province: text("birth_province"),
    p_citizenship: text("citizenship"),
    p_profession: text("profession"),
    p_document_type: text("document_type"),
    p_document_number: text("document_number"),
    p_bank_name: text("bank_name"),
    p_bank_holder: text("bank_holder"),
    p_iban: text("iban"),
    p_swift: text("swift"),
    p_signing_place: text("signing_place"),
    p_contract_version: CONTRACT_VERSION,
    p_decl_adult: true,
    p_decl_honorability: true,
    p_decl_no_compete: true,
    p_decl_no_conflict: true,
    p_decl_earned_threshold: scelte.earned,
    p_decl_unemployed: scelte.unemployed,
    p_decl_social_security: scelte.social,
    p_decl_pensioner: scelte.pensioner,
    p_decl_has_vat: scelte.vat,
    p_decl_vat_regime: vatRegime || null,
    p_decl_public_employee: scelte.publicEmployee,
    p_decl_public_full_time: publicFullTime,
    p_signed_ip: signedIp,
    p_signed_user_agent: userAgent,
  });

  if (error) return { error: error.message };

  revalidateTag("network-data", { expire: 0 });
  redirect("/diventa-incaricato/fatto");
}
