import { validaIban, validaBic, validaCoerenza } from "../src/lib/bank-validation.ts";

const casi: [string, string, boolean, string][] = [
  ["IT60X0542811101000000123456", "", true,  "IBAN italiano valido"],
  ["IT60 X054 2811 1010 0000 0123 456", "", true, "stesso, con spazi"],
  ["IT60X0542811101000000123457", "", false, "ultima cifra alterata -> checksum"],
  ["IT60X05428111010000001234",   "", false, "troppo corto per IT"],
  ["DE89370400440532013000", "", true,  "IBAN tedesco valido"],
  ["FR1420041010050500013M02606", "", true, "IBAN francese valido"],
  ["XX60X0542811101000000123456", "", false, "paese inesistente -> checksum"],
  ["", "", true, "vuoto = facoltativo"],
];
let ko = 0;
for (const [iban, , atteso, nota] of casi) {
  const r = validaIban(iban).ok;
  const esito = r === atteso ? "ok " : "KO ";
  if (r !== atteso) ko++;
  console.log(`${esito} ${nota}`);
}

const bic: [string, boolean, string][] = [
  ["BCITITMM", true, "BIC 8 caratteri"],
  ["BCITITMMXXX", true, "BIC 11 caratteri"],
  ["BCITIT", false, "troppo corto"],
  ["1CITITMM", false, "inizia con cifra"],
];
for (const [v, atteso, nota] of bic) {
  const r = validaBic(v).ok;
  if (r !== atteso) ko++;
  console.log(`${r === atteso ? "ok " : "KO "} ${nota}`);
}

const coer: [string, string, boolean, string][] = [
  ["IT60X0542811101000000123456", "BCITITMM", true,  "IT + IT -> coerenti"],
  ["IT60X0542811101000000123456", "DEUTDEFF", false, "IT + DE -> incoerenti"],
  ["DE89370400440532013000", "DEUTDEFF", true, "DE + DE -> coerenti"],
];
for (const [i, b, atteso, nota] of coer) {
  const r = validaCoerenza(i, b).ok;
  if (r !== atteso) ko++;
  console.log(`${r === atteso ? "ok " : "KO "} ${nota}`);
}
console.log(ko === 0 ? "\nTUTTI I CASI SUPERATI" : `\n${ko} CASI FALLITI`);
