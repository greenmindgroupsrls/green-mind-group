// Formato "brandizzato" del codice attività mostrato agli utenti: sempre
// "V" + 5 caratteri. L'azienda (activity_code = 0) usa la suffisso fisso
// "A" invece di un numero ("V0000A"); tutti gli altri sono "V" + il numero
// progressivo con zero-padding a 5 cifre ("V00001", "V00002", ... "V12345").
// L'activity_code numerico resta la chiave primaria reale in DB — questo è
// solo un layer di formattazione/parsing per l'interfaccia.
const CODE_WIDTH = 5;

export function formatActivityCode(code: number): string {
  if (code === 0) return "V0000A";
  return `V${String(code).padStart(CODE_WIDTH, "0")}`;
}

// Accetta sia il formato brandizzato ("V00008", "v00008", "V0000A") sia il
// numero nudo ("8", "0"), così i vecchi dati/link restano validi. Ritorna
// null se il testo non corrisponde a nessuno dei due formati.
export function parseActivityCode(input: string): number | null {
  const withoutPrefix = input.trim().replace(/^v/i, "");
  if (withoutPrefix === "") return null;

  if (/^0*a$/i.test(withoutPrefix)) return 0;
  if (/^\d+$/.test(withoutPrefix)) return parseInt(withoutPrefix, 10);

  return null;
}
