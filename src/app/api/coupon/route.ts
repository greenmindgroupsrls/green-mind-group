import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Il buono di fine sondaggio. Prima il codice lo inventava il browser e non
// veniva registrato da nessuna parte: al negozio non serviva a niente,
// perche' non c'era modo di sapere se fosse vero o gia' speso.
//
// Strada pubblica per necessita' (chi risponde al sondaggio non ha un
// account) ed elencata fra le eccezioni in proxy.ts. Il codice lo sceglie il
// database: lasciarlo scegliere a chi chiama vorrebbe dire lasciargli
// scegliere anche quello di qualcun altro.

const EMAIL_VALIDA = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(request: Request) {
  let corpo: { email?: unknown; nome?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }

  const email = String(corpo.email ?? "").trim().slice(0, 200);
  const nome = String(corpo.nome ?? "").trim().slice(0, 120);

  if (!EMAIL_VALIDA.test(email)) {
    return NextResponse.json({ error: "Indirizzo email non valido" }, { status: 400 });
  }

  try {
    // Client normale, non quello di servizio: crea_coupon_sondaggio e'
    // concessa ad anon proprio perche' questa strada non ha una sessione.
    // Nessun motivo di usare la chiave che puo' fare tutto.
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("crea_coupon_sondaggio", {
      p_email: email,
      p_nome: nome || null,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ codice: data as string });
  } catch (e) {
    console.error("[coupon] creazione fallita", e);
    return NextResponse.json({ error: "Non riusciamo a generare il buono" }, { status: 500 });
  }
}
