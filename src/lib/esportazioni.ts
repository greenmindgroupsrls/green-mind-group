import "server-only";

// FASCICOLI PER PERSONA
//
// Il CSV mette tutti in un file solo: va bene per il commercialista, non per
// rispondere a "fammi vedere cosa ha fatto Mario a settembre". Qui stanno i
// pezzi comuni all'elenco per voce e al PDF di ogni persona, cosi' i due non
// possono contare in modo diverso le stesse righe.

export const TIPI_FASCICOLO = ["orders", "withdrawals", "sales", "commissions", "members"] as const;
export type TipoFascicolo = (typeof TIPI_FASCICOLO)[number];

export function tipoValido(v: string | null): v is TipoFascicolo {
  return !!v && (TIPI_FASCICOLO as readonly string[]).includes(v);
}

// Membri e' una scheda anagrafica: non ha un mese, e' la fotografia di oggi.
export function tipoConMese(tipo: TipoFascicolo) {
  return tipo !== "members";
}

export function meseValido(v: string | null): v is string {
  return !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

// Di quanti minuti Roma e' avanti rispetto a UTC in un certo istante. Serve
// perche' "settembre" per l'azienda comincia a mezzanotte italiana, non a
// mezzanotte di Greenwich: un ordine fatto il 1 settembre alle 00:30 ora di
// Roma sta ancora in agosto per UTC, e finirebbe nel mese sbagliato.
function scartoRomaMinuti(istante: Date): number {
  const parti = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Rome",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(istante)
      .map((p) => [p.type, p.value]),
  );
  const comeUtc = Date.UTC(+parti.year, +parti.month - 1, +parti.day, +parti.hour, +parti.minute);
  return Math.round((comeUtc - istante.getTime()) / 60000);
}

function mezzanotteRoma(anno: number, mese1: number): Date {
  // Primo tentativo a mezzanotte UTC, poi si corregge con lo scarto di Roma
  // in quel giorno (60 minuti d'inverno, 120 d'estate).
  const grezzo = new Date(Date.UTC(anno, mese1 - 1, 1, 0, 0));
  return new Date(grezzo.getTime() - scartoRomaMinuti(grezzo) * 60000);
}

// Da "2026-09" a [inizio incluso, fine esclusa] come ISO, ora di Roma.
export function confiniMese(mese: string): { da: string; a: string } {
  const [anno, m] = mese.split("-").map(Number);
  const da = mezzanotteRoma(anno, m);
  const a = m === 12 ? mezzanotteRoma(anno + 1, 1) : mezzanotteRoma(anno, m + 1);
  return { da: da.toISOString(), a: a.toISOString() };
}

export function nomeMembro(m: {
  first_name: string | null;
  last_name: string | null;
  username: string;
}): string {
  const nome = [m.first_name, m.last_name].filter(Boolean).join(" ").trim();
  return nome || m.username;
}

export const NOME_MESE_IT = [
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
];

export function meseLeggibile(mese: string): string {
  const [anno, m] = mese.split("-").map(Number);
  return `${NOME_MESE_IT[m - 1]} ${anno}`;
}
