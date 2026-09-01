// Controlli su IBAN e SWIFT/BIC, condivisi tra il contratto incaricato e la
// richiesta di prelievo: un IBAN sbagliato in un bonifico e' un problema
// concreto, meglio intercettarlo mentre si scrive.

// Lunghezza esatta dell'IBAN per paese. L'elenco copre SEPA e i paesi piu'
// frequenti: per un paese non elencato si salta il controllo di lunghezza ma
// si applica comunque il calcolo di controllo, che vale per qualsiasi IBAN.
const LUNGHEZZE: Record<string, number> = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BR: 29,
  BY: 28, CH: 21, CR: 22, CY: 28, CZ: 24, DE: 22, DK: 18, DO: 28, EE: 20, EG: 29,
  ES: 24, FI: 18, FO: 18, FR: 27, GB: 22, GE: 22, GI: 23, GL: 18, GR: 27, GT: 28,
  HR: 21, HU: 28, IE: 22, IL: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28,
  LC: 32, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MD: 24, ME: 22, MK: 19, MR: 27,
  MT: 31, MU: 30, NL: 18, NO: 15, PK: 24, PL: 28, PS: 29, PT: 25, QA: 29, RO: 24,
  RS: 22, SA: 24, SC: 31, SE: 24, SI: 19, SK: 24, SM: 27, ST: 25, SV: 28, TL: 23,
  TN: 24, TR: 26, UA: 29, VA: 22, VG: 24, XK: 20,
};

export function normalizza(v: string): string {
  return v.replace(/[\s-]/g, "").toUpperCase();
}

// Calcolo di controllo mod-97 (ISO 13616): si spostano i primi 4 caratteri in
// fondo, si convertono le lettere in numeri (A=10 ... Z=35) e il resto della
// divisione per 97 deve valere 1. Il numero e' troppo grande per un intero
// normale, quindi si divide a blocchi.
function mod97(iban: string): number {
  const riordinato = iban.slice(4) + iban.slice(0, 4);
  let resto = 0;
  for (const ch of riordinato) {
    const codice = ch >= "A" && ch <= "Z" ? String(ch.charCodeAt(0) - 55) : ch;
    for (const cifra of codice) {
      resto = (resto * 10 + Number(cifra)) % 97;
    }
  }
  return resto;
}

export type Esito = { ok: true } | { ok: false; errore: string };

export function validaIban(valore: string): Esito {
  const iban = normalizza(valore);
  if (!iban) return { ok: true }; // campo facoltativo

  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(iban)) {
    return { ok: false, errore: "Formato non valido: due lettere del paese, due cifre, poi il conto" };
  }

  const paese = iban.slice(0, 2);
  const attesa = LUNGHEZZE[paese];
  if (attesa && iban.length !== attesa) {
    return {
      ok: false,
      errore: `Un IBAN ${paese} ha ${attesa} caratteri, questo ne ha ${iban.length}`,
    };
  }
  if (!attesa && (iban.length < 15 || iban.length > 34)) {
    return { ok: false, errore: "Lunghezza non plausibile per un IBAN" };
  }

  if (mod97(iban) !== 1) {
    return { ok: false, errore: "Il codice di controllo non torna: controlla di averlo copiato bene" };
  }

  return { ok: true };
}

export function validaBic(valore: string): Esito {
  const bic = normalizza(valore);
  if (!bic) return { ok: true }; // campo facoltativo

  // 4 lettere banca + 2 lettere paese + 2 alfanumerici localita' + 3
  // facoltativi per la filiale.
  if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic)) {
    return { ok: false, errore: "Uno Swift/BIC ha 8 o 11 caratteri (es. BCITITMM)" };
  }
  return { ok: true };
}

// Il legame tra i due: i caratteri 5 e 6 del BIC sono il paese della banca e
// devono coincidere con le prime due lettere dell'IBAN. Se non combaciano,
// uno dei due appartiene a un altro conto.
export function validaCoerenza(ibanValore: string, bicValore: string): Esito {
  const iban = normalizza(ibanValore);
  const bic = normalizza(bicValore);
  if (!iban || !bic) return { ok: true };
  if (!validaIban(iban).ok || !validaBic(bic).ok) return { ok: true }; // gli errori singoli si mostrano gia'

  const paeseIban = iban.slice(0, 2);
  const paeseBic = bic.slice(4, 6);
  if (paeseIban !== paeseBic) {
    return {
      ok: false,
      errore: `L'IBAN è di ${paeseIban} ma lo Swift è di ${paeseBic}: non appartengono allo stesso paese`,
    };
  }
  return { ok: true };
}

// Formattazione a gruppi di 4, come si legge sugli estratti conto.
export function formattaIban(valore: string): string {
  return normalizza(valore).replace(/(.{4})/g, "$1 ").trim();
}
