import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Riceve un lead dall'Edge Function "send-booking-notification" del progetto
// Vortix (stesso trigger che manda già l'email di notifica). Nessuna
// sessione utente qui: autenticazione via segreto condiviso, come i
// Database Webhook di Supabase (vedi x-hook-secret lato Vortix).
export async function POST(request: Request) {
  const secret = request.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.VORTIX_LEAD_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const record = (body as { record?: unknown })?.record ?? body;
  const { name, phone, email, address, notes, booking_date, booking_time } = (record ?? {}) as Record<
    string,
    unknown
  >;

  if (!name || !phone || !email) {
    return NextResponse.json({ error: "Campi obbligatori mancanti" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("leads").insert({
    source: "vortix",
    name: String(name),
    phone: String(phone),
    email: String(email),
    address: address ? String(address) : null,
    notes: notes ? String(notes) : null,
    requested_date: booking_date ? String(booking_date) : null,
    requested_time: booking_time ? String(booking_time) : null,
  });

  if (error) {
    console.error("[api/leads/vortix]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
