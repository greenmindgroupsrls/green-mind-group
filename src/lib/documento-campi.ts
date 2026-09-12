// I CAMPI DI OGNI MODULO
//
// Una sola descrizione dei campi, usata da tutti e tre: il modulo che
// l'incaricato compila, il PDF che ne esce e la scheda del documento
// archiviato. Se i campi vivessero in tre punti diversi, il giorno che se
// ne aggiunge uno il PDF resterebbe indietro senza che nessuno se ne
// accorga.
//
// Le voci vengono dai due documenti legali di settembre 2026 (contratto di
// vendita VORTIX e informativa privacy) e dal verbale di consegna.

import {
  COSTO_CONSEGNA,
  COSTO_INSTALLAZIONE,
  LUOGHI_CONCLUSIONE,
  MODALITA_PAGAMENTO,
  TIPI_CLIENTE,
  euro,
  type TipoDocumento,
} from "./documenti";

export type TipoCampo =
  | "testo"
  | "email"
  | "telefono"
  | "data"
  | "numero"
  | "select"
  | "checkbox"
  | "note";

export type Campo = {
  nome: string;
  label: string;
  tipo: TipoCampo;
  obbligatorio?: boolean;
  // I campi larghi occupano tutta la riga: indirizzi e note non stanno in
  // mezza colonna senza andare a capo tre volte.
  intera?: boolean;
  opzioni?: { value: string; label: string }[];
  aiuto?: string;
  // Mostra il campo solo se un altro campo ha un certo valore.
  seCampo?: { nome: string; vale: string[] };
};

export type Sezione = {
  titolo: string;
  descrizione?: string;
  campi: Campo[];
};

const PROVINCE_NOTA = "Sigla, es. PD";

const SEZIONE_CLIENTE: Sezione = {
  titolo: "Cliente",
  campi: [
    { nome: "cliente_nome", label: "Nome e cognome / Ragione sociale", tipo: "testo", obbligatorio: true, intera: true },
    { nome: "cliente_codice_fiscale", label: "Codice fiscale", tipo: "testo", obbligatorio: true },
    {
      nome: "cliente_partita_iva",
      label: "Partita IVA",
      tipo: "testo",
      aiuto: "Solo per i clienti professionisti",
      seCampo: { nome: "tipo_cliente", vale: ["professionista"] },
    },
    {
      nome: "cliente_sdi",
      label: "Codice SDI o PEC per la fattura",
      tipo: "testo",
      seCampo: { nome: "tipo_cliente", vale: ["professionista"] },
    },
    { nome: "cliente_indirizzo", label: "Indirizzo (via e numero civico)", tipo: "testo", obbligatorio: true, intera: true },
    { nome: "cliente_cap", label: "CAP", tipo: "testo", obbligatorio: true },
    { nome: "cliente_comune", label: "Comune", tipo: "testo", obbligatorio: true },
    { nome: "cliente_provincia", label: "Provincia", tipo: "testo", obbligatorio: true, aiuto: PROVINCE_NOTA },
    { nome: "cliente_telefono", label: "Telefono", tipo: "telefono", obbligatorio: true },
    { nome: "cliente_email", label: "E-mail", tipo: "email", obbligatorio: true, aiuto: "Qui arriva la copia firmata del documento" },
    {
      nome: "indirizzo_consegna",
      label: "Indirizzo di consegna e installazione, se diverso",
      tipo: "testo",
      intera: true,
    },
  ],
};

const SEZIONE_INCARICATO: Sezione = {
  titolo: "Incaricato alle vendite",
  descrizione: "Chi ha seguito la vendita. Il tesserino è quello previsto dall'art. 19 del D.Lgs. 114/1998.",
  campi: [
    { nome: "incaricato_nome", label: "Nome e cognome", tipo: "testo", obbligatorio: true },
    { nome: "incaricato_tesserino", label: "N. tesserino di riconoscimento", tipo: "testo" },
  ],
};

export const CAMPI_DOCUMENTO: Record<TipoDocumento, Sezione[]> = {
  contratto_vendita: [
    {
      titolo: "Tipo di contratto",
      descrizione:
        "Il luogo decide se il cliente ha diritto di recesso: in negozio non spetta, a casa sua o a distanza sì.",
      campi: [
        {
          nome: "luogo_conclusione",
          label: "Luogo di conclusione",
          tipo: "select",
          obbligatorio: true,
          intera: true,
          opzioni: LUOGHI_CONCLUSIONE.map((l) => ({ value: l.value, label: l.label })),
        },
        {
          nome: "tipo_cliente",
          label: "Il cliente agisce come",
          tipo: "select",
          obbligatorio: true,
          intera: true,
          opzioni: TIPI_CLIENTE.map((t) => ({ value: t.value, label: t.label })),
        },
      ],
    },
    SEZIONE_CLIENTE,
    {
      titolo: "Prodotto e prezzo",
      descrizione: "I prezzi sono IVA inclusa e comprendono ogni imposta.",
      campi: [
        {
          nome: "prodotto",
          label: "Versione acquistata",
          tipo: "select",
          obbligatorio: true,
          intera: true,
          opzioni: [
            { value: "GMGV005", label: `Vortix + 5 anni di garanzia — ${euro(1390)}` },
            { value: "GMGV008", label: `Vortix + 8 anni di garanzia — ${euro(1490)}` },
          ],
        },
        { nome: "consegna", label: `Consegna a domicilio (${euro(COSTO_CONSEGNA)})`, tipo: "checkbox", intera: true },
        {
          nome: "installazione",
          label: `Installazione a cura di GMG (${euro(COSTO_INSTALLAZIONE)})`,
          tipo: "checkbox",
          intera: true,
        },
      ],
    },
    {
      titolo: "Pagamento",
      campi: [
        {
          nome: "modalita_pagamento",
          label: "Modalità di pagamento",
          tipo: "select",
          obbligatorio: true,
          intera: true,
          opzioni: MODALITA_PAGAMENTO.map((m) => ({ value: m.value, label: m.label })),
        },
        { nome: "acconto", label: "Acconto versato alla firma (€)", tipo: "numero" },
        { nome: "saldo_data", label: "Saldo entro il", tipo: "data", aiuto: "Lasciare vuoto se si salda alla consegna" },
      ],
    },
    {
      titolo: "Consegna e installazione",
      campi: [
        { nome: "termine_consegna", label: "Termine di consegna", tipo: "data", aiuto: "Senza indicazione valgono 30 giorni" },
        {
          nome: "installazione_a_cura",
          label: "Installazione a cura di",
          tipo: "select",
          opzioni: [
            { value: "gmg", label: "GMG, con tecnici qualificati" },
            { value: "cliente", label: "Il cliente, con un tecnico di sua scelta" },
          ],
        },
      ],
    },
    {
      titolo: "Scarico in fognatura (art. 107, c. 3, D.Lgs. 152/2006)",
      descrizione:
        "Il dissipatore è ammesso solo dove il gestore del servizio idrico ha accertato che esiste la depurazione. La verifica va fatta prima della consegna.",
      campi: [
        { nome: "gestore_idrico", label: "Gestore del servizio idrico del Comune", tipo: "testo", intera: true },
        {
          nome: "zona_servita",
          label: "Ho verificato che l'indirizzo è servito da un sistema di depurazione",
          tipo: "checkbox",
          intera: true,
        },
      ],
    },
    SEZIONE_INCARICATO,
  ],

  informativa_privacy: [
    {
      titolo: "Cliente",
      campi: [
        { nome: "cliente_nome", label: "Nome e cognome", tipo: "testo", obbligatorio: true, intera: true },
        { nome: "cliente_email", label: "E-mail", tipo: "email", obbligatorio: true, intera: true },
      ],
    },
    {
      titolo: "Consensi",
      descrizione:
        "Il consenso al marketing è facoltativo: negarlo non ha alcuna conseguenza su contratto, consegna, installazione o garanzia.",
      campi: [
        {
          nome: "consenso_marketing",
          label: "Comunicazioni commerciali di Green Mind Group (e-mail, SMS, messaggistica, telefono, posta)",
          tipo: "select",
          obbligatorio: true,
          intera: true,
          opzioni: [
            { value: "presto", label: "Presto il consenso" },
            { value: "nego", label: "Nego il consenso" },
          ],
        },
        {
          nome: "opposizione_prodotti_analoghi",
          label: "Il cliente NON vuole e-mail su prodotti e servizi analoghi a quelli acquistati",
          tipo: "checkbox",
          intera: true,
        },
      ],
    },
  ],

  verbale_consegna: [
    {
      titolo: "Riferimenti",
      campi: [
        { nome: "numero_contratto", label: "Numero del contratto di vendita", tipo: "testo", aiuto: "Es. GMG-2026-0001" },
        { nome: "cliente_nome", label: "Cliente", tipo: "testo", obbligatorio: true },
        { nome: "cliente_email", label: "E-mail del cliente", tipo: "email", intera: true },
        { nome: "indirizzo_consegna", label: "Indirizzo di consegna", tipo: "testo", obbligatorio: true, intera: true },
      ],
    },
    {
      titolo: "Consegna",
      descrizione: "Per il consumatore, da questa data decorrono i 14 giorni per il recesso.",
      campi: [
        { nome: "data_consegna", label: "Data di consegna", tipo: "data", obbligatorio: true },
        { nome: "modello", label: "Modello consegnato", tipo: "testo", obbligatorio: true },
        {
          nome: "stato_dispositivo",
          label: "Stato del dispositivo",
          tipo: "select",
          intera: true,
          opzioni: [
            { value: "integro", label: "Integro e completo di accessori, manuale e certificato di garanzia" },
            { value: "anomalie", label: "Con anomalie (indicarle nelle note)" },
          ],
        },
      ],
    },
    {
      titolo: "Installazione",
      campi: [
        {
          nome: "installazione_eseguita",
          label: "Installazione",
          tipo: "select",
          intera: true,
          opzioni: [
            { value: "gmg", label: "Eseguita da GMG" },
            { value: "cliente", label: "Non richiesta: a cura del cliente" },
          ],
        },
        {
          nome: "esito_collaudo",
          label: "Esito del collaudo",
          tipo: "select",
          opzioni: [
            { value: "positivo", label: "Positivo" },
            { value: "negativo", label: "Negativo (indicare nelle note)" },
          ],
          seCampo: { nome: "installazione_eseguita", vale: ["gmg"] },
        },
        { nome: "gestore_idrico", label: "Gestore del servizio idrico", tipo: "testo" },
        {
          nome: "zona_verificata",
          label: "Indirizzo verificato come servito da depurazione",
          tipo: "checkbox",
          intera: true,
        },
      ],
    },
    {
      titolo: "Apparecchio usato (RAEE)",
      campi: [
        {
          nome: "raee",
          label: "Ritiro dell'apparecchio sostituito",
          tipo: "select",
          intera: true,
          opzioni: [
            { value: "ritirato", label: "Ritirato da GMG (uno contro uno)" },
            { value: "non_ritirato", label: "Non ritirato" },
            { value: "non_applicabile", label: "Nessun apparecchio da sostituire" },
          ],
        },
        { nome: "note", label: "Note", tipo: "note", intera: true },
      ],
    },
  ],

  contratto_incaricato: [
    {
      titolo: "Incaricato",
      descrizione:
        "Il testo integrale è quello caricato in Marketing → Documenti. Qui si raccoglie la firma autografa da allegare.",
      campi: [
        { nome: "incaricato_nome", label: "Nome e cognome", tipo: "testo", obbligatorio: true },
        { nome: "incaricato_codice_fiscale", label: "Codice fiscale", tipo: "testo" },
        { nome: "luogo_firma", label: "Luogo di firma", tipo: "testo", obbligatorio: true },
        { nome: "note", label: "Note", tipo: "note", intera: true },
      ],
    },
  ],
};

export function sezioniDi(tipo: TipoDocumento): Sezione[] {
  return CAMPI_DOCUMENTO[tipo];
}

export function tuttiICampi(tipo: TipoDocumento): Campo[] {
  return CAMPI_DOCUMENTO[tipo].flatMap((s) => s.campi);
}

// Il campo si compila solo se la condizione e' soddisfatta: un campo
// nascosto non deve risultare obbligatorio, altrimenti il modulo si blocca
// su una domanda che non e' nemmeno a schermo.
export function campoVisibile(campo: Campo, valori: Record<string, string>): boolean {
  if (!campo.seCampo) return true;
  return campo.seCampo.vale.includes(valori[campo.seCampo.nome] ?? "");
}

// Come si legge un valore salvato: le tendine mostrano l'etichetta, non il
// codice interno ("Bonifico bancario", non "bonifico").
export function valoreLeggibile(campo: Campo, valore: unknown): string {
  if (valore === undefined || valore === null || valore === "") return "-";
  if (campo.tipo === "checkbox") return valore === true || valore === "on" || valore === "si" ? "Sì" : "No";
  if (campo.tipo === "select") {
    const scelta = campo.opzioni?.find((o) => o.value === String(valore));
    return scelta ? scelta.label : String(valore);
  }
  if (campo.tipo === "data") {
    try {
      return new Date(String(valore)).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return String(valore);
    }
  }
  if (campo.tipo === "numero") {
    const n = Number(valore);
    return Number.isFinite(n) ? euro(n) : String(valore);
  }
  return String(valore);
}
