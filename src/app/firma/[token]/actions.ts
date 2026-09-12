"use server";

import { createHash, randomInt } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCodiceFirmaEmail } from "@/lib/email-documenti";
import {
  DOCUMENTO_LABEL,
  MAX_TENTATIVI_CODICE,
  MINUTI_VALIDITA_CODICE,
  percorsoFirma,
  type TipoDocumento,
} from "@/lib/documenti";

// FIRMA A DISTANZA
//
// Qui chi firma non ha un account: la pagina e' pubblica e le scritture
// passano dalla service role key, non dalla sessione di nessuno. Per questo
// ogni controllo va rifatto a mano a ogni passaggio — scadenza del link,
// codice giusto, documento ancora aperto — invece di appoggiarsi alle
// regole del database come nel resto del back office.
//
// Il link da solo non basta a firmare: serve anche il codice che arriva
// nella casella del cliente. Un indirizzo che gira in una chat non deve
// permettere a chiunque di firmare un contratto al posto suo.

export type StatoFirma = { error: string | null; fatto?: boolean };

function impronta(valore: string) {
  return createHash("sha256").update(valore).digest("hex");
}

type Collegamento = {
  token: string;
  document_id: number;
  ruolo: string;
  email: string;
  otp_hash: string | null;
  otp_expires_at: string | null;
  tentativi: number;
  used_at: string | null;
  expires_at: string;
};

async function leggiCollegamento(token: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("document_sign_links")
    .select("token, document_id, ruolo, email, otp_hash, otp_expires_at, tentativi, used_at, expires_at")
    .eq("token", token)
    .maybeSingle();
  return { admin, collegamento: (data as Collegamento | null) ?? null };
}

function collegamentoValido(collegamento: Collegamento | null): string | null {
  if (!collegamento) return "Link non valido";
  if (collegamento.used_at) return "Questo link è già stato usato per firmare";
  if (new Date(collegamento.expires_at).getTime() < Date.now()) {
    return "Il link è scaduto: chiedi all'incaricato di inviartene uno nuovo";
  }
  return null;
}

// Cosa mostrare a chi apre il link. Vive qui e non nella pagina perche'
// controllare la scadenza vuol dire guardare l'orologio, e una pagina non
// puo' farlo mentre disegna se stessa: il risultato cambierebbe a ogni
// ridisegno. Qui e' una funzione del server, chiamata una volta sola.
export async function apriCollegamento(token: string): Promise<
  | { errore: string; documento?: undefined }
  | {
      errore: null;
      documento: { numero: string; tipo: TipoDocumento; clienteNome: string };
      email: string;
    }
> {
  let admin;
  let collegamento: Collegamento | null;
  try {
    ({ admin, collegamento } = await leggiCollegamento(token));
  } catch {
    return { errore: "Il servizio di firma non è al momento disponibile. Riprova più tardi." };
  }

  const problema = collegamentoValido(collegamento);
  if (problema || !collegamento) {
    return { errore: problema ?? "Link non valido" };
  }

  const { data: documento } = await admin
    .from("signed_documents")
    .select("numero, doc_type, stato, client_name")
    .eq("id", collegamento.document_id)
    .maybeSingle();

  if (!documento) return { errore: "Documento non trovato." };
  if (documento.stato !== "bozza") {
    return { errore: "Questo documento è già stato chiuso e non si può più firmare." };
  }

  return {
    errore: null,
    documento: {
      numero: documento.numero,
      tipo: documento.doc_type as TipoDocumento,
      clienteNome: documento.client_name,
    },
    email: collegamento.email,
  };
}

export async function richiediCodice(token: string): Promise<StatoFirma> {
  let admin;
  let collegamento: Collegamento | null;
  try {
    ({ admin, collegamento } = await leggiCollegamento(token));
  } catch {
    return { error: "Firma a distanza non disponibile in questo momento" };
  }

  const problema = collegamentoValido(collegamento);
  if (problema || !collegamento) return { error: problema };

  const { data: documento } = await admin
    .from("signed_documents")
    .select("numero, doc_type, stato, client_name")
    .eq("id", collegamento.document_id)
    .maybeSingle();
  if (!documento) return { error: "Documento non trovato" };
  if (documento.stato !== "bozza") return { error: "Il documento è già stato chiuso" };

  // Sei cifre, generate con il generatore crittografico: Math.random() e'
  // prevedibile, e qui il codice e' l'unica cosa che separa il cliente da
  // chiunque abbia intercettato il link.
  const codice = String(randomInt(0, 1_000_000)).padStart(6, "0");

  const { error } = await admin
    .from("document_sign_links")
    .update({
      otp_hash: impronta(codice),
      otp_expires_at: new Date(Date.now() + MINUTI_VALIDITA_CODICE * 60 * 1000).toISOString(),
      tentativi: 0,
    })
    .eq("token", token);
  if (error) return { error: "Non riesco a generare il codice: riprova" };

  await sendCodiceFirmaEmail({
    to: collegamento.email,
    codice,
    documento: DOCUMENTO_LABEL[documento.doc_type as TipoDocumento],
    numero: documento.numero,
  });

  return { error: null };
}

export async function firmaConCodice(
  token: string,
  codice: string,
  firmatario: string,
  pngDataUrl: string,
): Promise<StatoFirma> {
  let admin;
  let collegamento: Collegamento | null;
  try {
    ({ admin, collegamento } = await leggiCollegamento(token));
  } catch {
    return { error: "Firma a distanza non disponibile in questo momento" };
  }

  const problema = collegamentoValido(collegamento);
  if (problema || !collegamento) return { error: problema };

  if (!collegamento.otp_hash || !collegamento.otp_expires_at) {
    return { error: "Chiedi prima il codice di conferma" };
  }
  if (new Date(collegamento.otp_expires_at).getTime() < Date.now()) {
    return { error: "Il codice è scaduto: chiedine uno nuovo" };
  }
  // Un tentativo alla volta non serve a nulla se i tentativi sono infiniti:
  // sei cifre si indovinano in fretta con un milione di prove.
  if (collegamento.tentativi >= MAX_TENTATIVI_CODICE) {
    return { error: "Troppi tentativi: chiedi un nuovo codice" };
  }
  if (impronta(codice.trim()) !== collegamento.otp_hash) {
    await admin
      .from("document_sign_links")
      .update({ tentativi: collegamento.tentativi + 1 })
      .eq("token", token);
    return { error: "Codice errato" };
  }

  if (!firmatario.trim()) return { error: "Scrivi il tuo nome e cognome" };

  const base64 = pngDataUrl.split(",")[1];
  if (!base64) return { error: "Firma non valida" };
  const png = Buffer.from(base64, "base64");
  if (png.byteLength < 800) return { error: "La firma sembra vuota: riprova" };

  const { data: documento } = await admin
    .from("signed_documents")
    .select("id, numero, owner_code, stato")
    .eq("id", collegamento.document_id)
    .maybeSingle();
  if (!documento) return { error: "Documento non trovato" };
  if (documento.stato !== "bozza") return { error: "Il documento è già stato chiuso" };

  const ruolo = collegamento.ruolo as "cliente" | "tecnico";
  const percorso = percorsoFirma(documento.owner_code, documento.numero, ruolo);
  const { error: erroreUpload } = await admin.storage
    .from("documenti-firmati")
    .upload(percorso, png, { contentType: "image/png", upsert: true });
  if (erroreUpload) return { error: "Non riesco a salvare la firma: riprova" };

  const h = await headers();
  const inoltrato = h.get("x-forwarded-for");
  const ip = inoltrato ? inoltrato.split(",")[0].trim() : h.get("x-real-ip");

  const { error: erroreFirma } = await admin.from("document_signatures").upsert(
    {
      document_id: documento.id,
      ruolo,
      firmatario: firmatario.trim(),
      image_path: percorso,
      metodo: "link",
      signed_at: new Date().toISOString(),
      signed_ip: ip,
      signed_user_agent: h.get("user-agent"),
    },
    { onConflict: "document_id,ruolo" },
  );
  if (erroreFirma) return { error: "Non riesco a registrare la firma: riprova" };

  await admin
    .from("document_sign_links")
    .update({ used_at: new Date().toISOString(), otp_hash: null })
    .eq("token", token);

  return { error: null, fatto: true };
}
