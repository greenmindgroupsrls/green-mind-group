import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { inviaEmailPrenotazione, type Prenotazione } from "@/lib/email-prenotazione";

// Prenotazioni dal sito Vortix (public/company). Prima passavano dal
// database Supabase separato del progetto Vortix, che poi richiamava una
// Edge Function per le email e inoltrava il lead qui con un segreto
// condiviso. Ora arrivano direttamente: un passaggio invece di quattro,
// nessuna chiave di un altro progetto dentro la pagina.
//
// La strada e' pubblica per necessita' (chi prenota non ha un account) ed e'
// elencata fra le eccezioni in proxy.ts.

const ORE_VALIDE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

function testo(v: unknown, max: number): string {
  return String(v ?? "")
    .trim()
    .slice(0, max);
}

// GET /api/prenotazioni?data=2026-09-10
// Orari gia' occupati per un giorno. Restituisce SOLO gli orari: chi guarda
// il sito non deve poter sapere chi ha prenotato, ne' quante persone. E' lo
// stesso motivo per cui il progetto Vortix esponeva una vista con due sole
// colonne invece della tabella.
export async function GET(request: Request) {
  const data = new URL(request.url).searchParams.get("data");
  if (!data || !DATA_VALIDA.test(data)) {
    return NextResponse.json({ error: "Data non valida" }, { status: 400 });
  }

  // Nessun errore qui deve impedire di prenotare: se la verifica non
  // riesce si mostrano tutti gli orari liberi, e a fermare un doppione ci
  // pensa il vincolo di unicita' sul database al momento dell'invio. Il
  // try copre anche la creazione del client, che lancia se la chiave di
  // servizio non e' configurata.
  try {
    const supabase = createAdminClient();
    const { data: righe, error } = await supabase
      .from("leads")
      .select("requested_time")
      .eq("source", "vortix")
      .eq("requested_date", data)
      .not("requested_time", "is", null);

    if (error) throw new Error(error.message);

    return NextResponse.json({
      occupati: (righe ?? []).map((r) => r.requested_time).filter(Boolean),
    });
  } catch (e) {
    console.error("[api/prenotazioni GET]", e instanceof Error ? e.message : e);
    return NextResponse.json({ occupati: [] });
  }
}

// POST /api/prenotazioni — registra la prenotazione e manda le due email.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non leggibile" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;

  const prenotazione: Prenotazione = {
    name: testo(b.name, 120),
    phone: testo(b.phone, 40),
    email: testo(b.email, 200).toLowerCase(),
    address: testo(b.address, 300) || null,
    notes: testo(b.notes, 1000) || null,
    booking_date: testo(b.booking_date, 10) || null,
    booking_time: testo(b.booking_time, 5) || null,
  };

  if (!prenotazione.name || !prenotazione.phone || !prenotazione.email) {
    return NextResponse.json({ error: "Nome, telefono ed email sono obbligatori" }, { status: 400 });
  }
  if (!prenotazione.email.includes("@")) {
    return NextResponse.json({ error: "Email non valida" }, { status: 400 });
  }
  if (prenotazione.booking_date && !DATA_VALIDA.test(prenotazione.booking_date)) {
    return NextResponse.json({ error: "Data non valida" }, { status: 400 });
  }
  if (prenotazione.booking_time && !ORE_VALIDE.test(prenotazione.booking_time)) {
    return NextResponse.json({ error: "Ora non valida" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("leads").insert({
    source: "vortix",
    name: prenotazione.name,
    phone: prenotazione.phone,
    email: prenotazione.email,
    address: prenotazione.address,
    notes: prenotazione.notes,
    requested_date: prenotazione.booking_date,
    requested_time: prenotazione.booking_time,
  });

  if (error) {
    // 23505 = violazione di unicita': qualcuno ha preso quello slot mentre
    // l'utente compilava il modulo. Non e' un guasto, e va detto in modo
    // che il sito possa rimandare l'utente a scegliere un altro orario.
    if (error.code === "23505") {
      return NextResponse.json({ error: "slot_occupato" }, { status: 409 });
    }
    console.error("[api/prenotazioni POST]", error.message);
    return NextResponse.json({ error: "Salvataggio non riuscito" }, { status: 500 });
  }

  // Le email partono dopo il salvataggio e non possono farlo fallire: se la
  // posta non parte, la prenotazione c'e' comunque e si vede nel back office.
  await inviaEmailPrenotazione(prenotazione);

  return NextResponse.json({ ok: true });
}
