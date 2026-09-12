// I DATI DELL'AZIENDA
//
// Stanno tutti qui perche' finiscono in ogni documento generato: se restano
// sparsi, il giorno che arriva la partita IVA bisogna ricordarsi di
// cambiarla in otto punti e uno resta indietro.
//
// I valori "XXXXXXXXX" sono i dati che l'azienda non ci ha ancora
// comunicato (11/09/2026). Non vanno inventati: finche' sono cosi',
// compaiono cosi' anche sul documento, e si vedono. La vecchia partita IVA
// 05806300280 NON va rimessa: l'azienda ha detto che comunichera' quella
// giusta.

export const MANCANTE = "XXXXXXXXX";

export const AZIENDA = {
  ragioneSociale: "Green Mind Group Srl",
  sedeVia: "Via San Pietro, 1",
  sedeCap: "35030",
  sedeComune: "Selvazzano Dentro",
  sedeProvincia: "PD",
  partitaIva: MANCANTE,
  rea: MANCANTE,
  capitaleSociale: MANCANTE,
  telefono: MANCANTE,
  email: "hello@greenmindgroup.pro",
  pec: "greenmindgroup@pec.it",
  amministratore: MANCANTE,
  iban: MANCANTE,
  banca: MANCANTE,
  // Garanzia commerciale del produttore N.T.A.: durata e modalita' di
  // attivazione non ancora comunicate.
  garanziaProduttore: MANCANTE,
  finanziatore: MANCANTE,
} as const;

export const PRODUTTORE = "N.T.A. - Nuove Tecnologie per l'Ambiente (Varese)";

export function sedeCompleta(): string {
  return `${AZIENDA.sedeVia} - ${AZIENDA.sedeCap} ${AZIENDA.sedeComune} (${AZIENDA.sedeProvincia})`;
}

export function intestazionePdf(): string[] {
  return [
    sedeCompleta(),
    `C.F. e P.IVA ${AZIENDA.partitaIva} - REA PD-${AZIENDA.rea} - Capitale sociale EUR ${AZIENDA.capitaleSociale} i.v.`,
    `Tel. ${AZIENDA.telefono} - ${AZIENDA.email} - PEC ${AZIENDA.pec}`,
  ];
}

// Quanti dati mancano ancora: il back office lo dice all'incaricato prima
// che stampi un contratto pieno di XXXXXXXXX senza accorgersene.
export function datiAziendaMancanti(): string[] {
  const etichette: Record<string, string> = {
    partitaIva: "Partita IVA",
    rea: "Numero REA",
    capitaleSociale: "Capitale sociale",
    telefono: "Telefono",
    amministratore: "Nome dell'amministratore",
    iban: "IBAN",
    banca: "Banca",
    garanziaProduttore: "Garanzia del produttore",
    finanziatore: "Società finanziaria",
  };
  return Object.entries(etichette)
    .filter(([chiave]) => AZIENDA[chiave as keyof typeof AZIENDA] === MANCANTE)
    .map(([, etichetta]) => etichetta);
}
