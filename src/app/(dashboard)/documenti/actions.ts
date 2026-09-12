"use server";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentMember } from "@/lib/current-member";
import { SITE_URL } from "@/lib/email";
import { sendCopiaFirmataEmail, sendLinkFirmaEmail } from "@/lib/email-documenti";
import {
  DOCUMENTO_LABEL,
  FIRME_RICHIESTE,
  ORE_VALIDITA_LINK,
  nomeFilePdf,
  percorsoFirma,
  percorsoPdf,
  tipoDocumentoValido,
  type RuoloFirma,
  type TipoDocumento,
} from "@/lib/documenti";
import { campoVisibile, tuttiICampi } from "@/lib/documento-campi";
import { blocchiDocumento, noteDocumento, slotTestoIntegrale } from "@/lib/documento-blocchi";
import { costruisciDocumento, dataOraIt, type FirmaDisegnata } from "@/lib/documento-pdf";

export type StatoModulo = { error: string | null };

// Le prove della firma: chi ha firmato, da dove e con cosa. Valgono piu'
// della firma stessa, che senza certificato e' solo un disegno.
async function traccia() {
  const h = await headers();
  const inoltrato = h.get("x-forwarded-for");
  return {
    ip: inoltrato ? inoltrato.split(",")[0].trim() : h.get("x-real-ip"),
    userAgent: h.get("user-agent"),
  };
}

// ---------------------------------------------------------------------
// Creazione del documento dal modulo compilato
// ---------------------------------------------------------------------
export async function creaDocumento(
  _prima: StatoModulo,
  formData: FormData,
): Promise<StatoModulo> {
  const membro = await getCurrentMember();
  if (!membro) return { error: "Devi essere autenticato" };

  const tipo = String(formData.get("tipo") ?? "");
  if (!tipoDocumentoValido(tipo)) return { error: "Tipo di documento non valido" };

  // I valori arrivano tutti come stringa: le spunte diventano booleani,
  // cosi' il PDF non deve indovinare cosa significa "on".
  const valori: Record<string, string> = {};
  const dati: Record<string, string | boolean> = {};
  for (const campo of tuttiICampi(tipo)) {
    const grezzo = formData.get(campo.nome);
    valori[campo.nome] = campo.tipo === "checkbox" ? "" : String(grezzo ?? "").trim();
    if (campo.tipo === "checkbox") dati[campo.nome] = grezzo === "on";
    else dati[campo.nome] = String(grezzo ?? "").trim();
  }

  // Un campo nascosto da una condizione non e' obbligatorio: chiederlo
  // bloccherebbe il modulo su una domanda che non si vede.
  for (const campo of tuttiICampi(tipo)) {
    if (!campo.obbligatorio || !campoVisibile(campo, valori)) continue;
    if (!String(dati[campo.nome] ?? "").trim()) {
      return { error: `Compila il campo "${campo.label}"` };
    }
  }

  const nomeCliente =
    String(dati.cliente_nome ?? "").trim() || String(dati.incaricato_nome ?? "").trim();
  const emailCliente = String(dati.cliente_email ?? "").trim() || null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("crea_documento", {
    p_doc_type: tipo,
    p_client_name: nomeCliente,
    p_client_email: emailCliente,
    p_client_code: null,
    p_dati: dati,
  });

  if (error) return { error: error.message };

  const creato = Array.isArray(data) ? data[0] : data;
  revalidatePath("/documenti");
  redirect(`/documenti/${creato.id}`);
}

// ---------------------------------------------------------------------
// Firma raccolta sul dispositivo dell'incaricato
// ---------------------------------------------------------------------
export async function salvaFirma(
  documentId: number,
  ruolo: RuoloFirma,
  firmatario: string,
  pngDataUrl: string,
): Promise<StatoModulo> {
  const membro = await getCurrentMember();
  if (!membro) return { error: "Devi essere autenticato" };
  if (!firmatario.trim()) return { error: "Indica chi sta firmando" };

  const base64 = pngDataUrl.split(",")[1];
  if (!base64) return { error: "Firma non valida" };
  const png = Buffer.from(base64, "base64");
  // Una firma vera pesa qualche kilobyte: sotto il migliaio di byte e' un
  // canvas vuoto o un puntino, non una firma.
  if (png.byteLength < 800) return { error: "La firma sembra vuota: riprova" };

  const supabase = await createClient();
  const { data: documento, error: erroreDoc } = await supabase
    .from("signed_documents")
    .select("id, numero, owner_code, stato")
    .eq("id", documentId)
    .single();
  if (erroreDoc || !documento) return { error: "Documento non trovato" };
  if (documento.stato !== "bozza") return { error: "Il documento è già chiuso" };

  const percorso = percorsoFirma(documento.owner_code, documento.numero, ruolo);
  const { error: erroreUpload } = await supabase.storage
    .from("documenti-firmati")
    .upload(percorso, png, { contentType: "image/png", upsert: true });
  if (erroreUpload) return { error: `Non riesco a salvare la firma: ${erroreUpload.message}` };

  const prova = await traccia();
  const { error } = await supabase.rpc("aggiungi_firma_documento", {
    p_document_id: documentId,
    p_ruolo: ruolo,
    p_firmatario: firmatario.trim(),
    p_image_path: percorso,
    p_metodo: "dispositivo",
    p_signed_ip: prova.ip,
    p_signed_user_agent: prova.userAgent,
  });
  if (error) return { error: error.message };

  revalidatePath(`/documenti/${documentId}`);
  return { error: null };
}

// ---------------------------------------------------------------------
// Link per far firmare il cliente dal proprio telefono
// ---------------------------------------------------------------------
export async function inviaLinkFirma(
  documentId: number,
  email: string,
): Promise<StatoModulo> {
  const membro = await getCurrentMember();
  if (!membro) return { error: "Devi essere autenticato" };
  const destinatario = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinatario)) {
    return { error: "Indirizzo email non valido" };
  }

  const supabase = await createClient();
  const { data: documento } = await supabase
    .from("signed_documents")
    .select("id, numero, doc_type, client_name, stato, owner_code")
    .eq("id", documentId)
    .single();
  if (!documento) return { error: "Documento non trovato" };
  if (documento.stato !== "bozza") return { error: "Il documento è già chiuso" };

  // I link vivono in una tabella che nessuno puo' leggere con la propria
  // sessione: si scrive con la service role key, come per le altre cose
  // che devono restare fuori dalla portata del browser.
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Firma a distanza non disponibile: manca la chiave di servizio Supabase" };
  }

  const token = `${randomUUID()}${randomBytes(8).toString("hex")}`;
  const scadenza = new Date(Date.now() + ORE_VALIDITA_LINK * 3600 * 1000).toISOString();

  const { error } = await admin.from("document_sign_links").insert({
    token,
    document_id: documentId,
    ruolo: "cliente",
    email: destinatario,
    expires_at: scadenza,
  });
  if (error) return { error: error.message };

  await sendLinkFirmaEmail({
    to: destinatario,
    nomeFirmatario: documento.client_name,
    documento: DOCUMENTO_LABEL[documento.doc_type as TipoDocumento],
    numero: documento.numero,
    url: `${SITE_URL}/firma/${token}`,
  });

  revalidatePath(`/documenti/${documentId}`);
  return { error: null };
}

// ---------------------------------------------------------------------
// Generazione e archiviazione del PDF
// ---------------------------------------------------------------------
async function caricaLogo(): Promise<Uint8Array | null> {
  try {
    return new Uint8Array(
      await readFile(path.join(process.cwd(), "public", "marchio", "simbolo.png")),
    );
  } catch {
    return null;
  }
}

export async function generaDocumento(documentId: number): Promise<StatoModulo> {
  const membro = await getCurrentMember();
  if (!membro) return { error: "Devi essere autenticato" };

  const supabase = await createClient();
  const { data: documento } = await supabase
    .from("signed_documents")
    .select("id, numero, doc_type, dati, client_name, client_email, owner_code, created_at")
    .eq("id", documentId)
    .single();
  if (!documento) return { error: "Documento non trovato" };

  const tipo = documento.doc_type as TipoDocumento;
  const { data: firmeSalvate } = await supabase
    .from("document_signatures")
    .select("ruolo, firmatario, image_path, metodo, signed_at, signed_ip")
    .eq("document_id", documentId);

  const mancanti = FIRME_RICHIESTE[tipo].filter(
    (ruolo) => !(firmeSalvate ?? []).some((f) => f.ruolo === ruolo),
  );
  if (mancanti.length > 0) {
    return { error: "Mancano ancora delle firme: raccoglile tutte prima di generare il documento" };
  }

  // Le immagini delle firme stanno nel bucket privato: si scaricano con la
  // sessione di chi sta generando, che e' il proprietario del documento.
  const firme: FirmaDisegnata[] = [];
  for (const ruolo of FIRME_RICHIESTE[tipo]) {
    const salvata = (firmeSalvate ?? []).find((f) => f.ruolo === ruolo)!;
    const { data: file } = await supabase.storage
      .from("documenti-firmati")
      .download(salvata.image_path);
    firme.push({
      ruolo,
      firmatario: salvata.firmatario,
      png: file ? new Uint8Array(await file.arrayBuffer()) : null,
      firmatoIl: dataOraIt(salvata.signed_at),
      ip: salvata.signed_ip,
      metodo: salvata.metodo as "dispositivo" | "link",
    });
  }

  // Il testo integrale, se l'azienda lo ha caricato in Marketing > Documenti.
  let testoIntegrale: Uint8Array | null = null;
  const slot = slotTestoIntegrale(tipo);
  if (slot) {
    const { data: documentoMarketing } = await supabase
      .from("marketing_documents")
      .select("file_url")
      .eq("doc_type", slot)
      .maybeSingle();
    if (documentoMarketing?.file_url) {
      try {
        const risposta = await fetch(documentoMarketing.file_url);
        if (risposta.ok) testoIntegrale = new Uint8Array(await risposta.arrayBuffer());
      } catch {
        // Un allegato irraggiungibile non deve impedire di firmare.
      }
    }
  }

  const dati = (documento.dati ?? {}) as Record<string, string | boolean>;
  const bytes = await costruisciDocumento({
    tipo,
    numero: documento.numero,
    dataDocumento: dataOraIt(documento.created_at),
    blocchi: blocchiDocumento(tipo, dati),
    note: noteDocumento(tipo, dati),
    firme,
    logo: await caricaLogo(),
    testoIntegrale,
  });

  const pdf = Buffer.from(bytes);
  const percorso = percorsoPdf(documento.owner_code, documento.numero);
  const { error: erroreUpload } = await supabase.storage
    .from("documenti-firmati")
    .upload(percorso, pdf, { contentType: "application/pdf", upsert: true });
  if (erroreUpload) return { error: `Non riesco ad archiviare il PDF: ${erroreUpload.message}` };

  const impronta = createHash("sha256").update(pdf).digest("hex");
  const { error } = await supabase.rpc("chiudi_documento", {
    p_document_id: documentId,
    p_pdf_path: percorso,
    p_pdf_sha256: impronta,
  });
  if (error) return { error: error.message };

  // La copia al cliente: il contratto gli promette un esemplare su
  // supporto durevole, e senza carta quella copia e' questa email.
  if (documento.client_email) {
    await sendCopiaFirmataEmail({
      to: documento.client_email,
      nomeFirmatario: documento.client_name,
      documento: DOCUMENTO_LABEL[tipo],
      numero: documento.numero,
      pdf,
      nomeFile: nomeFilePdf(tipo, documento.numero),
    });
  }

  revalidatePath(`/documenti/${documentId}`);
  revalidatePath("/documenti");
  return { error: null };
}
