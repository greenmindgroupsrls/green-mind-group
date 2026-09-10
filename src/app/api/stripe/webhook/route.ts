import { NextResponse } from "next/server";
import { getStripe, stripeConfigurato } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// L'AVVISO DI INCASSO
//
// Qui arriva Stripe quando un pagamento e' andato a buon fine, ed e' questo
// che sostituisce il clic su "Conferma pagamento": segna l'ordine pagato e
// fa nascere le provvigioni.
//
// Perche' non basta la pagina di ringraziamento: chi paga puo' chiudere il
// browser, perdere la linea o non tornare mai sul sito. Se la conferma
// dipendesse da quella pagina, ogni tanto un ordine pagato resterebbe da
// pagare — e nessuno se ne accorgerebbe finche' non chiama il cliente.
//
// Perche' due eventi e non uno: con Klarna e altri metodi differiti il
// "completato" arriva mentre i soldi non ci sono ancora, e l'incasso vero
// puo' arrivare ore o giorni dopo. Confermare sul solo "completato"
// vorrebbe dire pagare provvigioni su incassi che potrebbero non arrivare;
// aspettare solo l'altro vorrebbe dire non confermare mai le carte. Si
// guarda payment_status, che dice come stanno le cose davvero.

export const dynamic = "force-dynamic";

const EVENTI_DA_CONFERMARE = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

export async function POST(request: Request) {
  if (!stripeConfigurato() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe non configurato" }, { status: 503 });
  }

  const firma = request.headers.get("stripe-signature");
  if (!firma) {
    return NextResponse.json({ error: "Firma mancante" }, { status: 400 });
  }

  // Il corpo va letto grezzo: la firma si calcola sui byte esatti, e
  // rileggerlo come JSON prima di verificare la invaliderebbe.
  const corpo = await request.text();

  const stripe = getStripe();
  let evento;
  try {
    evento = stripe.webhooks.constructEvent(corpo, firma, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    // Firma non valida: non e' Stripe, o e' stato manomesso. Non si legge
    // nemmeno il contenuto.
    return NextResponse.json({ error: "Firma non valida" }, { status: 400 });
  }

  if (evento.type === "checkout.session.async_payment_failed") {
    // L'ordine resta in attesa: nessuna provvigione, niente da annullare.
    // Compare fra quelli da sollecitare nel back office.
    console.warn("[stripe] pagamento differito fallito", {
      sessione: (evento.data.object as { id: string }).id,
    });
    return NextResponse.json({ ricevuto: true });
  }

  if (!EVENTI_DA_CONFERMARE.has(evento.type)) {
    // Tutto il resto non ci riguarda, ma va risposto 200: un errore qui
    // farebbe riprovare Stripe all'infinito per eventi che ignoriamo.
    return NextResponse.json({ ricevuto: true });
  }

  const sessione = evento.data.object as { id: string; payment_status: string };

  if (sessione.payment_status === "unpaid") {
    // Metodo differito: i soldi non ci sono ancora. Si aspetta
    // async_payment_succeeded, che arrivera' quando ci saranno.
    return NextResponse.json({ ricevuto: true, inAttesa: true });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("conferma_pagamento_stripe", {
    p_session_id: sessione.id,
  });

  if (error) {
    // 500 di proposito: Stripe riprova da solo, con attese crescenti. Un
    // 200 qui vorrebbe dire perdere l'incasso di vista per sempre.
    console.error("[stripe] conferma non riuscita", { sessione: sessione.id, error });
    return NextResponse.json({ error: "Conferma non riuscita" }, { status: 500 });
  }

  return NextResponse.json({ ricevuto: true, confermato: true });
}
