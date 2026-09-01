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
  if (!checked("decl_clean_record")) {
    return {
      error:
        "Devi confermare la dichiarazione (e): assenza di fallimenti, condanne e carichi pendenti",
    };
  }

  const declOther = choice("decl_other_companies");
  const declVat = choice("decl_has_vat");
  const declInps = choice("decl_inps_exceeded");
  const declPublic = choice("decl_public_employee");

  if (declOther === null || declVat === null || declInps === null || declPublic === null) {
    return { error: "Rispondi a tutte le Dichiarazioni Referente" };
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
    p_decl_other_companies: declOther,
    p_decl_has_vat: declVat,
    p_decl_inps_exceeded: declInps,
    p_decl_public_employee: declPublic,
    p_signing_place: text("signing_place"),
    p_contract_version: CONTRACT_VERSION,
    p_signed_ip: signedIp,
    p_signed_user_agent: userAgent,
    p_decl_clean_record: true,
  });

  if (error) return { error: error.message };

  revalidateTag("network-data", { expire: 0 });
  redirect("/diventa-incaricato/fatto");
}
