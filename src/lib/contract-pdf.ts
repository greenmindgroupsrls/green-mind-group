import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

// Dati che compongono la prima pagina del contratto generato.
export type ContractData = {
  activityCode: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  taxId: string;
  companyName: string | null;
  address: string;
  birthDate: string;
  birthPlace: string;
  birthProvince: string;
  citizenship: string;
  profession: string;
  documentType: string;
  documentNumber: string;
  sponsor: string;
  bankName: string;
  bankHolder: string;
  iban: string;
  swift: string;
  declOtherCompanies: boolean;
  declHasVat: boolean;
  declInpsExceeded: boolean;
  declPublicEmployee: boolean;
  signingPlace: string;
  contractVersion: string;
  // assenti in anteprima: il documento esce marcato come bozza
  signedAt: string | null;
  signedIp: string | null;
};

const A4 = { w: 595.28, h: 841.89 };
const MARGIN = 48;
const INK = rgb(0.04, 0.15, 0.16);
const DIM = rgb(0.35, 0.42, 0.43);
const GOLD = rgb(0.7, 0.61, 0.45);
const HAIRLINE = rgb(0.85, 0.85, 0.85);

// I font standard PDF usano la codifica WinAnsi: qualunque carattere fuori
// da quel set fa fallire drawText. Le lettere accentate italiane ci sono
// tutte, ma simboli tipografici come il trattino lungo o le virgolette
// curve no — vanno sostituiti prima di disegnare.
function safe(s: unknown): string {
  return String(s ?? "")
    .replace(/[—–]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/€/g, "EUR")
    .replace(/[^\x20-\xFF]/g, "");
}

export async function buildContractPdf(
  data: ContractData,
  originalContractBytes: Uint8Array | null,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const page = pdf.addPage([A4.w, A4.h]);
  let y = A4.h - MARGIN;

  const draw = (
    text: string,
    x: number,
    yy: number,
    opts: { font?: PDFFont; size?: number; color?: typeof INK } = {},
  ) => {
    page.drawText(safe(text), {
      x,
      y: yy,
      font: opts.font ?? font,
      size: opts.size ?? 9.5,
      color: opts.color ?? INK,
    });
  };

  const line = (yy: number, p: PDFPage = page) => {
    p.drawLine({
      start: { x: MARGIN, y: yy },
      end: { x: A4.w - MARGIN, y: yy },
      thickness: 0.5,
      color: HAIRLINE,
    });
  };

  // ---- intestazione ----
  draw("MODULO RICHIESTA DI NOMINA INCARICATO ALLA VENDITA", MARGIN, y, { font: bold, size: 12.5 });
  y -= 15;
  draw("DIRETTA A DOMICILIO", MARGIN, y, { font: bold, size: 12.5 });
  y -= 13;
  draw("(Ai sensi dell'Art. 3, Comma 3, Legge 173/05)", MARGIN, y, { size: 8.5, color: DIM });
  y -= 20;
  line(y);
  y -= 18;

  // ---- bozza / firmato ----
  if (!data.signedAt) {
    page.drawRectangle({
      x: MARGIN,
      y: y - 16,
      width: A4.w - MARGIN * 2,
      height: 24,
      color: rgb(1, 0.95, 0.8),
    });
    draw("BOZZA - ANTEPRIMA NON FIRMATA", MARGIN + 10, y - 9, { font: bold, size: 10, color: rgb(0.6, 0.4, 0) });
    y -= 34;
  }

  draw("Codice Numerico Incaricato:", MARGIN, y, { size: 9, color: DIM });
  draw(data.activityCode, MARGIN + 150, y, { font: bold, size: 10 });
  y -= 14;
  draw("Società:", MARGIN, y, { size: 9, color: DIM });
  draw("Green Mind Group S.r.l.s.", MARGIN + 150, y, { font: bold, size: 10 });
  y -= 20;

  // ---- blocco dati, due colonne ----
  const COL2 = A4.w / 2 + 6;
  const row = (l1: string, v1: string, l2?: string, v2?: string) => {
    draw(l1, MARGIN, y, { size: 8, color: DIM });
    draw(v1 || "-", MARGIN, y - 11, { size: 10 });
    if (l2 !== undefined) {
      draw(l2, COL2, y, { size: 8, color: DIM });
      draw(v2 || "-", COL2, y - 11, { size: 10 });
    }
    y -= 26;
  };

  const section = (title: string) => {
    y -= 4;
    draw(title.toUpperCase(), MARGIN, y, { font: bold, size: 8.5, color: GOLD });
    y -= 6;
    line(y);
    y -= 16;
  };

  section("Dati dell'Incaricato");
  row("Cognome", data.lastName, "Nome", data.firstName);
  row("Indirizzo", data.address);
  row(
    "Nato/a il",
    data.birthDate,
    "a",
    data.birthProvince ? `${data.birthPlace} (${data.birthProvince})` : data.birthPlace,
  );
  row("Cellulare", data.phone, "Email", data.email);
  row("Cittadinanza", data.citizenship, "Professione", data.profession);
  row("Documento", `${data.documentType} ${data.documentNumber}`.trim());
  row("Codice Fiscale / P.IVA", data.taxId, "Sponsor", data.sponsor);
  if (data.companyName) row("Ragione sociale", data.companyName);

  section("Riferimenti bancari per accredito provvigioni");
  row("Banca", data.bankName, "Intestatario", data.bankHolder);
  row("IBAN", data.iban, "Swift", data.swift);

  // ---- dichiarazioni ----
  section("Dichiarazioni Referente");
  const box = (v: boolean) => (v ? "[X]" : "[ ]");
  const decl = (label: string, siNo: boolean) => {
    draw(label, MARGIN, y, { size: 9 });
    draw(`${box(siNo)} SI   ${box(!siNo)} NO`, A4.w - MARGIN - 95, y, { size: 9, font: bold });
    y -= 16;
  };
  decl("a) Incaricato da altre imprese di vendita diretta a domicilio", data.declOtherCompanies);
  decl("b) In possesso di Partita IVA", data.declHasVat);
  decl("c) Superamento di EUR 5.000 netti annui (ai fini INPS)", data.declInpsExceeded);
  decl("d) Dipendente pubblico", data.declPublicEmployee);
  // La (e) e' una dichiarazione affermata con spunta obbligatoria nel form,
  // non una domanda: nel PDF si rende come casella barrata, coerente con
  // a-d, cosi' il documento mostra che e' stata dichiarata esplicitamente.
  y -= 2;
  draw("[X]", MARGIN, y, { font: bold, size: 9 });
  draw(
    "e) Dichiara di NON essere stato dichiarato fallito, di NON aver riportato condanne,",
    MARGIN + 20,
    y,
    { size: 8.5 },
  );
  y -= 11;
  draw("di NON avere carichi pendenti né di essere sottoposto a misure di prevenzione.", MARGIN + 20, y, {
    size: 8.5,
  });
  y -= 20;

  // ---- accettazione ----
  section("Accettazione");
  const acc = (t: string) => {
    draw("[X]", MARGIN, y, { font: bold, size: 9 });
    draw(t, MARGIN + 20, y, { size: 8.8 });
    y -= 14;
  };
  acc("Ho letto e accetto integralmente il contratto di Incaricato alle Vendite.");
  acc("Ai sensi e per gli effetti degli artt. 1341 e 1342 c.c. approvo specificamente gli articoli");
  draw("1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13 e 16.", MARGIN + 20, y + 2, { size: 8.8 });
  y -= 12;
  acc("Confermo la veridicità delle Dichiarazioni Referente sopra riportate.");
  y -= 6;

  draw(`Luogo: ${data.signingPlace || "-"}`, MARGIN, y, { size: 9.5 });
  if (data.signedAt) {
    draw(`Data: ${data.signedAt}`, COL2, y, { size: 9.5 });
  }
  y -= 22;

  // ---- prova della firma elettronica ----
  if (data.signedAt) {
    page.drawRectangle({
      x: MARGIN,
      y: y - 46,
      width: A4.w - MARGIN * 2,
      height: 56,
      color: rgb(0.96, 0.97, 0.95),
    });
    draw("FIRMA ELETTRONICA SEMPLICE - REGISTRAZIONE", MARGIN + 10, y - 2, {
      font: bold,
      size: 8,
      color: GOLD,
    });
    draw(`Accettato online da ${data.fullName} (codice ${data.activityCode})`, MARGIN + 10, y - 15, {
      size: 8.5,
    });
    draw(`Data e ora: ${data.signedAt}`, MARGIN + 10, y - 26, { size: 8.5 });
    draw(
      `Indirizzo IP: ${data.signedIp ?? "non registrato"}   -   Versione testo: ${data.contractVersion}`,
      MARGIN + 10,
      y - 37,
      { size: 8.5 },
    );
    y -= 62;
  }

  draw(
    "Il testo integrale del contratto accettato segue nelle pagine successive.",
    MARGIN,
    y,
    { size: 8, color: DIM },
  );

  // ---- pagine originali del contratto ----
  if (originalContractBytes) {
    try {
      const original = await PDFDocument.load(originalContractBytes);
      const copied = await pdf.copyPages(original, original.getPageIndices());
      copied.forEach((p) => pdf.addPage(p));
    } catch {
      // Se il PDF originale non e' leggibile si genera comunque la prima
      // pagina con i dati: meglio un documento parziale che nessuno.
    }
  }

  return pdf.save();
}
