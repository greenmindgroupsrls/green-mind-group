import type { Dizionario } from "./dizionario";

// Il database solleva codici, non frasi: "gmg.carrello_vuoto" invece di
// "Il carrello e' vuoto". Qui il codice torna a essere una frase, nella
// lingua di chi sta guardando.
//
// Alcuni codici portano con se' un valore, separato dai due punti:
// "gmg.prodotto_non_trovato:12" -> "Il prodotto 12 non e' piu' disponibile".
// Il valore sta li' perche' RAISE conta i suoi argomenti: toglierlo avrebbe
// voluto dire riscrivere ogni chiamata invece che la sola frase.
//
// La rete di sicurezza e' la riga finale: qualunque cosa arrivi e non sia
// un codice conosciuto diventa un messaggio generico tradotto. Nessun
// utente vede piu' il testo grezzo di un errore, nemmeno per le funzioni
// che sollevano ancora in italiano - e l'originale finisce nei log, dove
// serve davvero.

const PREFISSO = "gmg.";

type Errore = { message?: string | null } | string | null | undefined;

function testoGrezzo(errore: Errore): string {
  if (!errore) return "";
  return (typeof errore === "string" ? errore : (errore.message ?? "")).trim();
}

export function messaggioErrore(errore: Errore, testi: Dizionario): string {
  const grezzo = testoGrezzo(errore);
  const T = testi.errori;

  if (grezzo.startsWith(PREFISSO)) {
    const [codice, ...resto] = grezzo.slice(PREFISSO.length).split(":");
    const voce = (T as Record<string, string | undefined>)[codice];
    if (voce) return voce.replaceAll("{valore}", resto.join(":").trim());
  }

  // Non e' un codice nostro: potrebbe essere un guasto di rete, un vincolo
  // del database, qualunque cosa. All'utente serve sapere che riprovare ha
  // senso; a noi serve il testo esatto, che va nei log del server.
  if (grezzo) console.error("[errore non tradotto]", grezzo);
  return T.generico;
}
