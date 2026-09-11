import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { safe } from "./contract-pdf";

// IL FASCICOLO DI UNA PERSONA
//
// Un generatore solo per tutte e cinque le voci delle esportazioni: cambia
// il contenuto, non l'aspetto. Cosi' un riepilogo ordini e un estratto
// provvigioni si riconoscono come documenti della stessa azienda, e una
// correzione all'impaginazione vale per tutti.
//
// Stesse regole di testo del contratto (safe): i font standard dei PDF non
// conoscono i caratteri fuori dal Latin-1, e un nome con un simbolo strano
// farebbe fallire l'intero documento invece di una lettera.

const A4 = { w: 595.28, h: 841.89 };
const MARGINE = 48;
const INK = rgb(0.04, 0.15, 0.16);
const DIM = rgb(0.35, 0.42, 0.43);
const HAIRLINE = rgb(0.85, 0.85, 0.85);
const FONDO_TESTATA = rgb(0.95, 0.96, 0.96);
const PIEDE = 34;

export type Colonna = {
  titolo: string;
  // Quota della larghezza utile: le quote di una tabella sommano a 1.
  quota: number;
  destra?: boolean;
};

export type Blocco = { titolo: string; voci: [string, string][] };

export type OpzioniFascicolo = {
  titolo: string;
  periodo: string | null;
  membro: { codice: string; nome: string };
  dati?: [string, string][];
  colonne?: Colonna[];
  righe?: string[][];
  vuoto?: string;
  totali?: [string, string][];
  blocchi?: Blocco[];
  logo?: Uint8Array | null;
};

const NOTA_PIEDE =
  "Documento interno generato dal back office Green Mind Group Srl - non costituisce fattura.";

export async function costruisciFascicolo(o: OpzioniFascicolo): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(safe(`${o.titolo} - ${o.membro.codice} ${o.membro.nome}${o.periodo ? ` - ${o.periodo}` : ""}`));
  pdf.setAuthor("Green Mind Group Srl");

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = o.logo ? await pdf.embedPng(o.logo).catch(() => null) : null;

  const larghezzaUtile = A4.w - MARGINE * 2;
  let pagina!: PDFPage;
  let y = 0;

  // Taglia un testo con i puntini se non entra: una cella che sborda si
  // sovrappone alla colonna accanto e rende illeggibili tutte e due.
  const adatta = (testo: string, f: PDFFont, dim: number, max: number) => {
    let t = safe(testo);
    if (f.widthOfTextAtSize(t, dim) <= max) return t;
    while (t.length > 1 && f.widthOfTextAtSize(`${t}...`, dim) > max) t = t.slice(0, -1);
    return `${t}...`;
  };

  const scrivi = (testo: string, x: number, yy: number, op: { f?: PDFFont; dim?: number; colore?: typeof INK; max?: number } = {}) => {
    const f = op.f ?? font;
    const dim = op.dim ?? 9;
    const t = op.max ? adatta(testo, f, dim, op.max) : safe(testo);
    pagina.drawText(t, { x, y: yy, font: f, size: dim, color: op.colore ?? INK });
  };

  const scriviADestra = (testo: string, xDestro: number, yy: number, op: { f?: PDFFont; dim?: number; colore?: typeof INK } = {}) => {
    const f = op.f ?? font;
    const dim = op.dim ?? 9;
    const t = safe(testo);
    scrivi(t, xDestro - f.widthOfTextAtSize(t, dim), yy, op);
  };

  const riga = (yy: number) =>
    pagina.drawLine({
      start: { x: MARGINE, y: yy },
      end: { x: A4.w - MARGINE, y: yy },
      thickness: 0.5,
      color: HAIRLINE,
    });

  const nuovaPagina = (prima: boolean) => {
    pagina = pdf.addPage([A4.w, A4.h]);
    y = A4.h - MARGINE;

    // Testata: marchio, azienda, data di generazione. Sulle pagine dopo la
    // prima resta solo una riga col nome, per sapere di chi e' il foglio se
    // si stacca dagli altri.
    if (logo && prima) {
      const alto = 30;
      const largo = (logo.width / logo.height) * alto;
      pagina.drawImage(logo, { x: MARGINE, y: y - alto + 6, width: largo, height: alto });
      scrivi("Green Mind Group Srl", MARGINE + largo + 10, y - 8, { f: bold, dim: 11 });
      scrivi("Back office - documento interno", MARGINE + largo + 10, y - 20, { dim: 8, colore: DIM });
    } else {
      scrivi("Green Mind Group Srl", MARGINE, y - 8, { f: bold, dim: prima ? 11 : 9 });
    }
    const generato = new Date().toLocaleString("it-IT", {
      timeZone: "Europe/Rome",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    scriviADestra(`Generato il ${generato}`, A4.w - MARGINE, y - 8, { dim: 8, colore: DIM });
    y -= prima ? 40 : 22;
    riga(y);
    y -= prima ? 26 : 16;

    if (prima) {
      scrivi(o.titolo, MARGINE, y, { f: bold, dim: 16 });
      y -= 18;
      if (o.periodo) {
        scrivi(o.periodo, MARGINE, y, { dim: 10, colore: DIM });
        y -= 14;
      }
      scrivi(`${o.membro.codice}  ${o.membro.nome}`, MARGINE, y, { f: bold, dim: 11 });
      y -= 24;
    } else {
      scrivi(`${o.titolo} - ${o.membro.codice} ${o.membro.nome}${o.periodo ? ` - ${o.periodo}` : ""}`, MARGINE, y, {
        dim: 8.5,
        colore: DIM,
        max: larghezzaUtile,
      });
      y -= 18;
    }
  };

  // Se sotto non c'e' abbastanza spazio si passa alla pagina dopo prima di
  // scrivere, non a meta' riga.
  const serve = (spazio: number) => {
    if (y - spazio < MARGINE + PIEDE) {
      nuovaPagina(false);
      return true;
    }
    return false;
  };

  nuovaPagina(true);

  // ---- dati a coppie (la scheda membro e' solo questo) ----
  if (o.dati?.length) {
    for (const [etichetta, valore] of o.dati) {
      serve(16);
      scrivi(etichetta, MARGINE, y, { dim: 9, colore: DIM });
      scrivi(valore || "-", MARGINE + 150, y, { dim: 9.5, max: larghezzaUtile - 150 });
      y -= 16;
    }
    y -= 8;
  }

  // ---- tabella ----
  if (o.colonne?.length) {
    const xs: number[] = [];
    let x = MARGINE;
    for (const c of o.colonne) {
      xs.push(x);
      x += c.quota * larghezzaUtile;
    }
    const cella = (i: number) => o.colonne![i].quota * larghezzaUtile - 8;

    const testataTabella = () => {
      pagina.drawRectangle({ x: MARGINE, y: y - 6, width: larghezzaUtile, height: 18, color: FONDO_TESTATA });
      o.colonne!.forEach((c, i) => {
        if (c.destra) scriviADestra(c.titolo, xs[i] + cella(i), y, { f: bold, dim: 8 });
        else scrivi(c.titolo, xs[i] + 4, y, { f: bold, dim: 8, max: cella(i) });
      });
      y -= 20;
    };

    testataTabella();
    if (!o.righe?.length) {
      scrivi(o.vuoto ?? "Nessuna voce.", MARGINE + 4, y, { dim: 9, colore: DIM });
      y -= 18;
    }
    for (const r of o.righe ?? []) {
      // Pagina nuova = testata ripetuta: una colonna di numeri senza titolo
      // a pagina tre non si sa piu' cosa sia.
      if (serve(16)) testataTabella();
      r.forEach((valore, i) => {
        const c = o.colonne![i];
        if (c.destra) scriviADestra(adatta(valore, font, 9, cella(i)), xs[i] + cella(i), y, { dim: 9 });
        else scrivi(valore, xs[i] + 4, y, { dim: 9, max: cella(i) });
      });
      y -= 6;
      riga(y);
      y -= 10;
    }
    y -= 4;
  }

  // ---- totali ----
  if (o.totali?.length) {
    serve(18 * o.totali.length + 6);
    for (const [etichetta, valore] of o.totali) {
      scriviADestra(etichetta, A4.w - MARGINE - 110, y, { dim: 9, colore: DIM });
      scriviADestra(valore, A4.w - MARGINE, y, { f: bold, dim: 10 });
      y -= 16;
    }
    y -= 10;
  }

  // ---- blocchi di dettaglio (es. fatturazione e spedizione di ogni ordine) ----
  for (const b of o.blocchi ?? []) {
    serve(24 + b.voci.length * 14);
    scrivi(b.titolo, MARGINE, y, { f: bold, dim: 10 });
    y -= 6;
    riga(y);
    y -= 14;
    for (const [etichetta, valore] of b.voci) {
      serve(14);
      scrivi(etichetta, MARGINE, y, { dim: 8.5, colore: DIM });
      scrivi(valore || "-", MARGINE + 130, y, { dim: 9, max: larghezzaUtile - 130 });
      y -= 14;
    }
    y -= 10;
  }

  // Piede e numerazione alla fine, quando si sa quante pagine sono.
  const pagine = pdf.getPages();
  pagine.forEach((p, i) => {
    pagina = p;
    riga(MARGINE + 14);
    scrivi(NOTA_PIEDE, MARGINE, MARGINE, { dim: 7.5, colore: DIM, max: larghezzaUtile - 70 });
    scriviADestra(`Pagina ${i + 1} di ${pagine.length}`, A4.w - MARGINE, MARGINE, { dim: 7.5, colore: DIM });
  });

  return pdf.save();
}

export function euroPdf(v: number | string | null | undefined): string {
  const n = Number(v ?? 0);
  // Il simbolo dell'euro non esiste nei font standard dei PDF: si scrive EUR.
  return `${n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`;
}

export function dataPdf(iso: string | null | undefined, conOra = false): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(conOra ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}
