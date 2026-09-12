import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { safe } from "./contract-pdf";
import { AZIENDA, intestazionePdf } from "./azienda";
import { DOCUMENTO_LABEL, RUOLO_LABEL, type RuoloFirma, type TipoDocumento } from "./documenti";

// IL PDF DI UN DOCUMENTO FIRMATO
//
// Un generatore solo per tutti e quattro i documenti: cambia il contenuto,
// non l'aspetto — stessa scelta gia' fatta per i fascicoli delle
// esportazioni. La prima parte e' il modulo compilato, in fondo ci sono le
// firme disegnate col dito e il riquadro delle prove.
//
// Quando l'azienda ha caricato in Marketing > Documenti il PDF del testo
// integrale (contratto, informativa), quelle pagine vengono accodate: cosi'
// il documento archiviato contiene anche le clausole, non solo i dati.
//
// Stessa regola di testo del contratto incaricato (safe): i font standard
// dei PDF non conoscono i caratteri fuori dal Latin-1.

const A4 = { w: 595.28, h: 841.89 };
const MARGINE = 48;
const INK = rgb(0.04, 0.15, 0.16);
const DIM = rgb(0.35, 0.42, 0.43);
const GOLD = rgb(0.7, 0.61, 0.45);
const HAIRLINE = rgb(0.85, 0.85, 0.85);
const FONDO = rgb(0.95, 0.96, 0.96);
const PIEDE = 34;

export type BloccoDati = {
  titolo: string;
  voci: [string, string][];
};

export type FirmaDisegnata = {
  ruolo: RuoloFirma;
  firmatario: string;
  png: Uint8Array | null;
  firmatoIl: string;
  ip: string | null;
  metodo: "dispositivo" | "link";
};

export type OpzioniDocumento = {
  tipo: TipoDocumento;
  numero: string;
  dataDocumento: string;
  sottotitolo?: string | null;
  blocchi: BloccoDati[];
  // Paragrafi discorsivi (es. il promemoria sul recesso) stampati sotto i dati.
  note?: string[];
  firme: FirmaDisegnata[];
  logo: Uint8Array | null;
  testoIntegrale: Uint8Array | null;
};

export function dataOraIt(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("it-IT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

export async function costruisciDocumento(o: OpzioniDocumento): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const marchio = o.logo ? await pdf.embedPng(o.logo).catch(() => null) : null;

  let pagina: PDFPage = pdf.addPage([A4.w, A4.h]);
  let y = 0;
  let numeroPagina = 0;

  const scrivi = (
    testo: string,
    x: number,
    yy: number,
    opzioni: { font?: PDFFont; size?: number; color?: typeof INK } = {},
  ) => {
    pagina.drawText(safe(testo), {
      x,
      y: yy,
      font: opzioni.font ?? font,
      size: opzioni.size ?? 9.5,
      color: opzioni.color ?? INK,
    });
  };

  const riga = (yy: number) => {
    pagina.drawLine({
      start: { x: MARGINE, y: yy },
      end: { x: A4.w - MARGINE, y: yy },
      thickness: 0.5,
      color: HAIRLINE,
    });
  };

  // Va a capo da sola: senza, una nota lunga uscirebbe dal foglio a destra
  // invece di continuare sotto.
  const spezza = (testo: string, tipografia: PDFFont, dimensione: number, larghezza: number) => {
    const parole = safe(testo).split(/\s+/);
    const righe: string[] = [];
    let corrente = "";
    for (const parola of parole) {
      const prova = corrente ? `${corrente} ${parola}` : parola;
      if (tipografia.widthOfTextAtSize(prova, dimensione) > larghezza && corrente) {
        righe.push(corrente);
        corrente = parola;
      } else {
        corrente = prova;
      }
    }
    if (corrente) righe.push(corrente);
    return righe;
  };

  const piedePagina = () => {
    scrivi(
      `${AZIENDA.ragioneSociale} - ${DOCUMENTO_LABEL[o.tipo]} - ${o.numero}`,
      MARGINE,
      PIEDE,
      { size: 7.5, color: DIM },
    );
    const etichetta = `Pagina ${numeroPagina}`;
    scrivi(etichetta, A4.w - MARGINE - font.widthOfTextAtSize(etichetta, 7.5), PIEDE, {
      size: 7.5,
      color: DIM,
    });
  };

  const nuovaPagina = () => {
    if (numeroPagina > 0) piedePagina();
    if (numeroPagina > 0) pagina = pdf.addPage([A4.w, A4.h]);
    numeroPagina += 1;
    y = A4.h - MARGINE;

    // Carta intestata, su ogni pagina.
    if (marchio) {
      const altezza = 34;
      const larghezza = (marchio.width / marchio.height) * altezza;
      pagina.drawImage(marchio, { x: MARGINE, y: y - altezza + 6, width: larghezza, height: altezza });
    }
    const testata = intestazionePdf();
    scrivi(AZIENDA.ragioneSociale.toUpperCase(), MARGINE + (marchio ? 46 : 0), y - 6, {
      font: bold,
      size: 11,
    });
    testata.forEach((linea, i) => {
      scrivi(linea, MARGINE + (marchio ? 46 : 0), y - 18 - i * 9, { size: 7, color: DIM });
    });
    y -= 48;
    riga(y);
    y -= 20;
  };

  const spazio = (necessario: number) => {
    if (y - necessario < PIEDE + 24) nuovaPagina();
  };

  nuovaPagina();

  // ---- titolo ----
  scrivi(DOCUMENTO_LABEL[o.tipo].toUpperCase(), MARGINE, y, { font: bold, size: 13 });
  y -= 15;
  if (o.sottotitolo) {
    scrivi(o.sottotitolo, MARGINE, y, { size: 8.5, color: DIM });
    y -= 13;
  }
  scrivi(`Documento n. ${o.numero}   -   ${o.dataDocumento}`, MARGINE, y, { size: 9, color: DIM });
  y -= 18;

  // Un documento senza firme e' un'anteprima: va detto sopra, non scoperto
  // in fondo.
  if (o.firme.length === 0) {
    pagina.drawRectangle({
      x: MARGINE,
      y: y - 16,
      width: A4.w - MARGINE * 2,
      height: 24,
      color: rgb(1, 0.95, 0.8),
    });
    scrivi("BOZZA - ANTEPRIMA NON FIRMATA", MARGINE + 10, y - 9, {
      font: bold,
      size: 10,
      color: rgb(0.6, 0.4, 0),
    });
    y -= 34;
  }

  // ---- blocchi di dati ----
  const COL2 = A4.w / 2 + 4;
  const larghezzaValore = A4.w / 2 - MARGINE - 10;

  for (const blocco of o.blocchi) {
    spazio(60);
    scrivi(blocco.titolo.toUpperCase(), MARGINE, y, { font: bold, size: 8.5, color: GOLD });
    y -= 6;
    riga(y);
    y -= 16;

    let colonnaSinistra = true;
    let altezzaRiga = 0;
    for (const [etichetta, valore] of blocco.voci) {
      const righeValore = spezza(valore || "-", font, 9.5, larghezzaValore);
      const alto = 12 + righeValore.length * 11;

      if (colonnaSinistra) {
        spazio(alto + 6);
        altezzaRiga = alto;
        scrivi(etichetta, MARGINE, y, { size: 7.5, color: DIM });
        righeValore.forEach((r, i) => scrivi(r, MARGINE, y - 11 - i * 11, { size: 9.5 }));
        colonnaSinistra = false;
      } else {
        scrivi(etichetta, COL2, y, { size: 7.5, color: DIM });
        righeValore.forEach((r, i) => scrivi(r, COL2, y - 11 - i * 11, { size: 9.5 }));
        y -= Math.max(altezzaRiga, alto) + 8;
        colonnaSinistra = true;
      }
    }
    if (!colonnaSinistra) y -= altezzaRiga + 8;
    y -= 6;
  }

  // ---- note ----
  for (const nota of o.note ?? []) {
    const righe = spezza(nota, font, 8.5, A4.w - MARGINE * 2);
    spazio(righe.length * 11 + 10);
    righe.forEach((r, i) => scrivi(r, MARGINE, y - i * 11, { size: 8.5, color: DIM }));
    y -= righe.length * 11 + 10;
  }

  // ---- firme ----
  if (o.firme.length > 0) {
    spazio(150);
    y -= 6;
    scrivi("FIRME", MARGINE, y, { font: bold, size: 8.5, color: GOLD });
    y -= 6;
    riga(y);
    y -= 14;

    const larghezzaBox = (A4.w - MARGINE * 2 - 20) / 2;
    let indice = 0;
    for (const firma of o.firme) {
      const colonna = indice % 2;
      const x = MARGINE + colonna * (larghezzaBox + 20);
      if (colonna === 0) spazio(110);

      const cima = y;
      scrivi(RUOLO_LABEL[firma.ruolo], x, cima, { font: bold, size: 8 });

      if (firma.png) {
        try {
          const immagine = await pdf.embedPng(firma.png);
          const altezza = 40;
          const larghezza = Math.min((immagine.width / immagine.height) * altezza, larghezzaBox);
          pagina.drawImage(immagine, { x, y: cima - 12 - altezza, width: larghezza, height: altezza });
        } catch {
          // Una firma illeggibile non deve impedire di generare il
          // documento: resta la riga con nome, data e IP.
        }
      }

      pagina.drawLine({
        start: { x, y: cima - 58 },
        end: { x: x + larghezzaBox, y: cima - 58 },
        thickness: 0.5,
        color: HAIRLINE,
      });
      scrivi(firma.firmatario, x, cima - 70, { size: 9 });
      scrivi(
        `${firma.metodo === "link" ? "Firmato a distanza" : "Firmato sul dispositivo"} - ${firma.firmatoIl}`,
        x,
        cima - 80,
        { size: 7, color: DIM },
      );

      if (colonna === 1 || indice === o.firme.length - 1) y = cima - 96;
      indice += 1;
    }

    // ---- prova della firma elettronica ----
    spazio(78);
    pagina.drawRectangle({
      x: MARGINE,
      y: y - 60,
      width: A4.w - MARGINE * 2,
      height: 70,
      color: FONDO,
    });
    scrivi("FIRMA ELETTRONICA SEMPLICE - REGISTRAZIONE", MARGINE + 10, y - 2, {
      font: bold,
      size: 8,
      color: GOLD,
    });
    let riga1 = y - 15;
    for (const firma of o.firme) {
      scrivi(
        `${RUOLO_LABEL[firma.ruolo]}: ${firma.firmatario} - ${firma.firmatoIl} - IP ${firma.ip ?? "non registrato"}`,
        MARGINE + 10,
        riga1,
        { size: 7.5 },
      );
      riga1 -= 10;
    }
    scrivi(
      "L'impronta digitale (SHA-256) di questo PDF e' registrata negli archivi di Green Mind Group al momento della firma.",
      MARGINE + 10,
      riga1,
      { size: 7, color: DIM },
    );
    y -= 76;
  }

  // ---- testo integrale, se caricato in Marketing > Documenti ----
  if (o.testoIntegrale) {
    spazio(20);
    scrivi("Il testo integrale del documento segue nelle pagine successive.", MARGINE, y, {
      size: 8,
      color: DIM,
    });
    y -= 14;
    try {
      const originale = await PDFDocument.load(o.testoIntegrale);
      const copiate = await pdf.copyPages(originale, originale.getPageIndices());
      copiate.forEach((p) => pdf.addPage(p));
    } catch {
      // Se il PDF caricato non e' leggibile resta il modulo compilato:
      // meglio un documento parziale che nessun documento.
    }
  }

  piedePagina();
  return pdf.save();
}
