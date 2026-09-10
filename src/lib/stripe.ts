import "server-only";
import Stripe from "stripe";

// Una sola istanza per tutta l'applicazione. Il metodo vecchio (assegnare la
// chiave a una variabile globale) e' deprecato in tutti gli SDK: qui si crea
// un client e si chiamano i metodi su quello.
//
// La chiave non sta nel codice: la mette Vercel fra le variabili d'ambiente
// quando l'integrazione Stripe viene collegata al progetto.
let istanza: Stripe | null = null;

export function stripeConfigurato() {
  return !!process.env.STRIPE_SECRET_KEY;
}

// Interruttore separato dalle chiavi, e apposta.
//
// Le chiavi in produzione oggi sono quelle di PROVA: se il pulsante "Paga
// ora" comparisse ai clienti, una carta vera verrebbe rifiutata e l'ordine
// sembrerebbe rotto. Avere le chiavi non basta quindi a mostrarlo — serve
// dirlo esplicitamente, impostando PAGAMENTI_ONLINE=1.
//
// Il giorno del passaggio all'incasso vero: si sostituiscono le chiavi con
// quelle definitive e si accende questa. Due gesti distinti, cosi' nessuno
// dei due succede per sbaglio.
export function pagamentiOnlineAttivi() {
  return stripeConfigurato() && process.env.PAGAMENTI_ONLINE === "1";
}

export function getStripe(): Stripe {
  const chiave = process.env.STRIPE_SECRET_KEY;
  if (!chiave) {
    throw new Error("gmg.stripe.non_configurato");
  }
  if (!istanza) {
    istanza = new Stripe(chiave);
  }
  return istanza;
}

// Etichetta con cui i pagamenti si riconoscono nella dashboard di Stripe,
// per distinguere questo flusso da altri che nascessero in futuro. Le otto
// lettere finali sono richieste dal formato.
export const ETICHETTA_INTEGRAZIONE = "gmg-negozio-vortix-qhrmdxlb";

// Stripe ragiona in centesimi interi: 1390,00 € sono 139000. Passare un
// numero con la virgola qui e' il modo classico di sbagliare di un fattore
// cento, quindi la conversione sta in un posto solo.
export function inCentesimi(importo: number): number {
  return Math.round(importo * 100);
}
