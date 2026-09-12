import "server-only";
import { CAMPI_DOCUMENTO, campoVisibile, valoreLeggibile } from "./documento-campi";
import {
  COSTO_CONSEGNA,
  COSTO_DISINSTALLAZIONE_RECESSO,
  COSTO_INSTALLAZIONE,
  GIORNI_RECESSO,
  PREZZI_PRODOTTO,
  euro,
  recessoApplicabile,
  type TipoCliente,
  type TipoDocumento,
} from "./documenti";
import { AZIENDA, PRODUTTORE } from "./azienda";
import type { BloccoDati } from "./documento-pdf";

// DAI CAMPI COMPILATI AL PDF
//
// Prende i valori del modulo e li trasforma nei blocchi che il generatore
// PDF sa disegnare, piu' le poche frasi che per legge devono comparire sul
// documento (recesso, garanzia, art. 107 sullo scarico in fognatura).
//
// I prezzi si ricalcolano qui a partire dalle scelte, invece di fidarsi di
// un totale arrivato dal browser: e' l'unico punto che nessuno puo'
// modificare da fuori.

export type Dati = Record<string, string | boolean | number | null | undefined>;

const vero = (v: unknown) => v === true || v === "on" || v === "si" || v === "true";
const testo = (dati: Dati, nome: string) => String(dati[nome] ?? "").trim();

export function calcolaTotale(dati: Dati): {
  prodotto: { nome: string; prezzo: number } | null;
  consegna: number;
  installazione: number;
  totale: number;
} {
  const prodotto = PREZZI_PRODOTTO[testo(dati, "prodotto")] ?? null;
  const consegna = vero(dati.consegna) ? COSTO_CONSEGNA : 0;
  const installazione = vero(dati.installazione) ? COSTO_INSTALLAZIONE : 0;
  return {
    prodotto,
    consegna,
    installazione,
    totale: (prodotto?.prezzo ?? 0) + consegna + installazione,
  };
}

// I blocchi generici: le stesse sezioni del modulo, con i valori leggibili.
function blocchiDaiCampi(tipo: TipoDocumento, dati: Dati): BloccoDati[] {
  const valori: Record<string, string> = {};
  for (const [k, v] of Object.entries(dati)) valori[k] = typeof v === "string" ? v : String(v ?? "");

  return CAMPI_DOCUMENTO[tipo]
    .map((sezione) => ({
      titolo: sezione.titolo,
      voci: sezione.campi
        .filter((campo) => campoVisibile(campo, valori))
        .filter((campo) => campo.tipo !== "checkbox" || dati[campo.nome] !== undefined)
        .map((campo) => [campo.label, valoreLeggibile(campo, dati[campo.nome])] as [string, string]),
    }))
    .filter((blocco) => blocco.voci.length > 0);
}

export function blocchiDocumento(tipo: TipoDocumento, dati: Dati): BloccoDati[] {
  const blocchi = blocchiDaiCampi(tipo, dati);

  if (tipo === "contratto_vendita") {
    const conto = calcolaTotale(dati);
    blocchi.push({
      titolo: "Totale da pagare",
      voci: [
        ["Prodotto", conto.prodotto ? `${conto.prodotto.nome} - ${euro(conto.prodotto.prezzo)}` : "-"],
        ["Consegna", conto.consegna ? euro(conto.consegna) : "Non richiesta"],
        ["Installazione", conto.installazione ? euro(conto.installazione) : "Non richiesta"],
        ["TOTALE COMPLESSIVO (IVA inclusa)", euro(conto.totale)],
      ],
    });
    blocchi.push({
      titolo: "Pagamento a favore di",
      voci: [
        ["Intestatario", AZIENDA.ragioneSociale],
        ["IBAN", AZIENDA.iban],
        ["Banca", AZIENDA.banca],
        ["Attenzione", "Gli incaricati non sono autorizzati a ricevere pagamenti a proprio favore."],
      ],
    });
  }

  return blocchi;
}

export function noteDocumento(tipo: TipoDocumento, dati: Dati): string[] {
  const note: string[] = [];

  if (tipo === "contratto_vendita") {
    const tipoCliente = (testo(dati, "tipo_cliente") || "consumatore") as TipoCliente;
    const luogo = testo(dati, "luogo_conclusione");

    note.push(
      `Prodotto: dissipatore di rifiuti alimentari VORTIX, prodotto da ${PRODUTTORE}, da installare sotto il lavello. Il modello consegnato risulta dal verbale di consegna; la matricola si registra all'attivazione della garanzia del produttore.`,
    );

    if (recessoApplicabile(luogo, tipoCliente)) {
      note.push(
        `DIRITTO DI RECESSO. Il Cliente consumatore puo' recedere senza motivo entro ${GIORNI_RECESSO} giorni dalla consegna, comunicandolo a ${AZIENDA.ragioneSociale}, ${AZIENDA.sedeVia} - ${AZIENDA.sedeCap} ${AZIENDA.sedeComune} (${AZIENDA.sedeProvincia}), PEC ${AZIENDA.pec}, e-mail ${AZIENDA.email}, anche con il modulo allegato al contratto. GMG rimborsa tutti i pagamenti ricevuti, comprese consegna e installazione, entro 14 giorni. Se il dispositivo e' gia' installato, disinstallazione, ripristino dello scarico e ritiro costano ${euro(COSTO_DISINSTALLAZIONE_RECESSO)} e vengono trattenuti dal rimborso; in alternativa il Cliente puo' provvedere a proprie spese. Se non e' ancora installato, GMG lo ritira gratuitamente. VORTIX e' un prodotto di serie: non si applicano le esclusioni dell'art. 59 del Codice del Consumo e l'installazione non fa venire meno il recesso.`,
      );
    } else if (tipoCliente === "professionista") {
      note.push(
        "Il Cliente agisce per scopi professionali: non spetta il diritto di recesso. I vizi vanno denunciati entro 8 giorni dalla scoperta e l'azione si prescrive in un anno dalla consegna (artt. 1490 e 1495 c.c.). Foro esclusivo di Padova.",
      );
    } else {
      note.push(
        "Contratto concluso nei locali commerciali: il diritto di recesso previsto per le vendite fuori dai locali o a distanza non si applica.",
      );
    }

    note.push(
      `GARANZIA. Per il consumatore vale la garanzia legale di conformita': GMG risponde dei difetti che si manifestano entro due anni dalla consegna (artt. 128 e seguenti del Codice del Consumo). La garanzia commerciale del produttore (${AZIENDA.garanziaProduttore}) si aggiunge e non la sostituisce.`,
    );
    note.push(
      "SCARICO IN FOGNATURA. Lo scarico dei rifiuti alimentari tritati e' consentito solo dove il gestore del servizio idrico ha accertato l'esistenza di un sistema di depurazione (art. 107, comma 3, D.Lgs. 152/2006). Dopo l'installazione GMG, in qualita' di rivenditore, la comunica al gestore competente.",
    );
    note.push(
      `Il Cliente dichiara di aver ricevuto la scheda tecnica in lingua italiana e copia del presente documento. ${
        recessoApplicabile(luogo, tipoCliente) ? "Dichiara inoltre di essere stato informato del diritto di recesso e di aver ricevuto il modulo di recesso." : ""
      }`.trim(),
    );
  }

  if (tipo === "informativa_privacy") {
    note.push(
      `Titolare del trattamento: ${AZIENDA.ragioneSociale}, ${AZIENDA.sedeVia} - ${AZIENDA.sedeCap} ${AZIENDA.sedeComune} (${AZIENDA.sedeProvincia}), e-mail ${AZIENDA.email}, PEC ${AZIENDA.pec}.`,
    );
    note.push(
      "Il Cliente dichiara di aver ricevuto e letto l'informativa sul trattamento dei dati personali resa ai sensi dell'art. 13 del Regolamento (UE) 2016/679. I dati non vengono ceduti a terzi per finalita' di marketing. Ogni e-mail commerciale contiene il link per annullare l'iscrizione, e il consenso si puo' revocare in qualsiasi momento senza conseguenze sul contratto.",
    );
  }

  if (tipo === "verbale_consegna") {
    note.push(
      `Per il Cliente consumatore, dalla data di consegna indicata sopra decorrono i ${GIORNI_RECESSO} giorni per l'esercizio del diritto di recesso. Il numero di matricola viene registrato all'attivazione della garanzia del produttore.`,
    );
    if (vero(dati.zona_verificata)) {
      note.push(
        "L'indirizzo di installazione risulta servito da un sistema di depurazione: GMG comunica l'installazione al gestore del servizio idrico competente (art. 107, comma 3, D.Lgs. 152/2006).",
      );
    }
  }

  if (tipo === "contratto_incaricato") {
    note.push(
      "Nomina a incaricato alle vendite a domicilio ai sensi della Legge 173/2005. Il testo integrale accettato segue nelle pagine successive.",
    );
  }

  return note;
}

// Il documento da cui prendere il testo integrale, tra quelli caricati in
// Marketing > Documenti. Il verbale di consegna non ne ha uno: e' un
// modulo nostro, non un contratto con clausole.
export function slotTestoIntegrale(tipo: TipoDocumento): string | null {
  if (tipo === "contratto_vendita") return "modulo_ordine";
  if (tipo === "informativa_privacy") return "privacy";
  if (tipo === "contratto_incaricato") return "contratto_incaricato";
  return null;
}
