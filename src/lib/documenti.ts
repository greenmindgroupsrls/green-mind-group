// I DOCUMENTI DA FAR FIRMARE
//
// Quattro documenti, quattro moduli, firme diverse: il contratto di vendita
// lo firmano cliente e incaricato, l'informativa solo il cliente, il verbale
// di consegna cliente e tecnico, il contratto di incarico solo l'incaricato.
// Qui stanno le cose che servono sia al browser sia al server, cosi' il
// modulo, il PDF e l'archivio non possono avere idee diverse su cosa
// contiene un documento e su chi deve firmarlo.
//
// I testi di riferimento sono i due documenti legali di settembre 2026
// (contratto di vendita VORTIX e informativa privacy): prezzi, termini e
// articoli citati qui vengono da li'.

export const TIPI_DOCUMENTO = [
  "contratto_vendita",
  "informativa_privacy",
  "verbale_consegna",
  "contratto_incaricato",
] as const;

export type TipoDocumento = (typeof TIPI_DOCUMENTO)[number];

export function tipoDocumentoValido(v: string | null | undefined): v is TipoDocumento {
  return !!v && (TIPI_DOCUMENTO as readonly string[]).includes(v);
}

export type RuoloFirma = "cliente" | "incaricato" | "tecnico";

export const DOCUMENTO_LABEL: Record<TipoDocumento, string> = {
  contratto_vendita: "Contratto di vendita VORTIX",
  informativa_privacy: "Informativa privacy e consensi",
  verbale_consegna: "Verbale di consegna e installazione",
  contratto_incaricato: "Contratto incaricato",
};

export const DOCUMENTO_DESCRIZIONE: Record<TipoDocumento, string> = {
  contratto_vendita:
    "L'ordine del cliente: prodotto, prezzo, consegna, installazione e diritto di recesso.",
  informativa_privacy:
    "Come trattiamo i dati del cliente, con il consenso facoltativo al marketing.",
  verbale_consegna:
    "Si compila a casa del cliente il giorno della consegna: da qui decorrono i 14 giorni di recesso.",
  contratto_incaricato: "La nomina a incaricato alle vendite, firmata dall'incaricato stesso.",
};

export const RUOLO_LABEL: Record<RuoloFirma, string> = {
  cliente: "Cliente",
  incaricato: "Incaricato alle vendite",
  tecnico: "Tecnico o incaricato che consegna",
};

// Chi deve firmare cosa. L'ordine conta: e' anche l'ordine in cui il modulo
// chiede le firme.
export const FIRME_RICHIESTE: Record<TipoDocumento, RuoloFirma[]> = {
  contratto_vendita: ["cliente", "incaricato"],
  informativa_privacy: ["cliente"],
  verbale_consegna: ["cliente", "tecnico"],
  contratto_incaricato: ["incaricato"],
};

// Solo il cliente puo' firmare da un altro dispositivo: l'incaricato e il
// tecnico sono sul posto, il link a distanza per loro non avrebbe senso.
export function firmaADistanzaAmmessa(ruolo: RuoloFirma): boolean {
  return ruolo === "cliente";
}

// ---------------------------------------------------------------------
// Condizioni economiche (contratto di vendita, settembre 2026)
// ---------------------------------------------------------------------

// Le due versioni a listino, con i prezzi del contratto. Stanno qui e non
// nel file server perche' il modulo deve poter mostrare il totale mentre
// l'incaricato spunta le voci, senza chiedere nulla al server.
export const PREZZI_PRODOTTO: Record<string, { nome: string; prezzo: number }> = {
  GMGV005: { nome: "Vortix + 5 anni di garanzia", prezzo: 1390 },
  GMGV008: { nome: "Vortix + 8 anni di garanzia", prezzo: 1490 },
};

export const COSTO_CONSEGNA = 15;
export const COSTO_INSTALLAZIONE = 49;
// Se il cliente recede dopo l'installazione, la disinstallazione e il ritiro
// costano quanto l'installazione e si trattengono dal rimborso (art. 10.5).
export const COSTO_DISINSTALLAZIONE_RECESSO = 49;

export const GIORNI_RECESSO = 14;

export const LUOGHI_CONCLUSIONE = [
  { value: "fuori_locali", label: "Fuori dai locali commerciali (es. a casa del cliente)" },
  { value: "locali", label: "Nei locali commerciali di GMG" },
  { value: "distanza", label: "A distanza (telefono, e-mail, internet)" },
] as const;

export type LuogoConclusione = (typeof LUOGHI_CONCLUSIONE)[number]["value"];

// Il recesso spetta al consumatore solo se il contratto non e' stato
// concluso in negozio: vale la pena ricordarlo dove si sceglie il luogo.
export function recessoApplicabile(luogo: string, cliente: TipoCliente): boolean {
  return cliente === "consumatore" && (luogo === "fuori_locali" || luogo === "distanza");
}

export type TipoCliente = "consumatore" | "professionista";

export const TIPI_CLIENTE: { value: TipoCliente; label: string; nota: string }[] = [
  {
    value: "consumatore",
    label: "Consumatore",
    nota: "Persona che acquista per scopi estranei alla propria attività professionale (art. 3 Codice del Consumo).",
  },
  {
    value: "professionista",
    label: "Professionista o impresa",
    nota: "Acquista per scopi professionali: niente diritto di recesso, garanzia secondo il Codice civile.",
  },
];

export const MODALITA_PAGAMENTO = [
  { value: "bonifico", label: "Bonifico bancario" },
  { value: "bonifico_istantaneo", label: "Bonifico istantaneo" },
  { value: "pos", label: "Carta di pagamento (POS)" },
  { value: "finanziamento", label: "Finanziamento" },
] as const;

export function euro(valore: number): string {
  return valore.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

// ---------------------------------------------------------------------
// Stato di un documento
// ---------------------------------------------------------------------

export type StatoDocumento = "bozza" | "firmato" | "annullato";

export const STATO_LABEL: Record<StatoDocumento, string> = {
  bozza: "Da firmare",
  firmato: "Firmato",
  annullato: "Annullato",
};

export type DocumentoRiga = {
  id: number;
  numero: string;
  tipo: TipoDocumento;
  stato: StatoDocumento;
  clienteNome: string;
  clienteEmail: string | null;
  ownerCode: number;
  creatoIl: string;
  firmatoIl: string | null;
  firme: { ruolo: RuoloFirma; firmatario: string; firmatoIl: string }[];
};

// Percorsi dentro il bucket privato "documenti-firmati". La prima cartella
// e' il codice dell'incaricato: le regole di Storage danno accesso a quella
// cartella e basta, quindi il percorso non e' una convenzione estetica ma
// la cosa che decide chi puo' leggere il file.
export function cartellaDocumento(ownerCode: number, numero: string): string {
  return `${ownerCode}/${numero}`;
}

export function percorsoFirma(ownerCode: number, numero: string, ruolo: RuoloFirma): string {
  return `${cartellaDocumento(ownerCode, numero)}/firma-${ruolo}.png`;
}

export function percorsoPdf(ownerCode: number, numero: string): string {
  return `${cartellaDocumento(ownerCode, numero)}/documento.pdf`;
}

export function nomeFilePdf(tipo: TipoDocumento, numero: string): string {
  const base: Record<TipoDocumento, string> = {
    contratto_vendita: "contratto-vendita",
    informativa_privacy: "informativa-privacy",
    verbale_consegna: "verbale-consegna",
    contratto_incaricato: "contratto-incaricato",
  };
  return `gmg-${base[tipo]}-${numero}.pdf`;
}

// Il link di firma a distanza scade: un indirizzo che vale per sempre e che
// gira in una chat e' un modo per far firmare qualcun altro.
export const ORE_VALIDITA_LINK = 72;
export const MINUTI_VALIDITA_CODICE = 15;
export const MAX_TENTATIVI_CODICE = 5;
