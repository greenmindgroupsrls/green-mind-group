import "server-only";
import { cookies, headers } from "next/headers";
import { COOKIE_LINGUA, LINGUA_PREDEFINITA, isLingua, linguaDaBrowser, type Lingua } from "./config";
import it from "./dizionari/it.json";

// L'italiano e' il riferimento: la sua forma definisce le chiavi che tutte
// le altre lingue devono avere. Un dizionario incompleto non compila.
export type Dizionario = typeof it;

// Import statici e non dinamici: cosi' i dizionari finiscono nel pacchetto
// al momento della compilazione, invece di essere cercati a runtime su un
// percorso che in produzione non esiste piu'.
const dizionari: Record<Lingua, () => Promise<{ default: Dizionario }>> = {
  it: async () => ({ default: it }),
  en: () => import("./dizionari/en.json"),
  fr: () => import("./dizionari/fr.json"),
  es: () => import("./dizionari/es.json"),
  de: () => import("./dizionari/de.json"),
  ru: () => import("./dizionari/ru.json"),
};

// Che lingua vuole chi sta guardando: prima la scelta salvata, poi quella
// del browser, infine l'italiano.
export async function linguaCorrente(): Promise<Lingua> {
  const salvata = (await cookies()).get(COOKIE_LINGUA)?.value;
  if (isLingua(salvata)) return salvata;

  const intestazioni = await headers();
  return linguaDaBrowser(intestazioni.get("accept-language"));
}

export async function getDizionario(lingua?: Lingua): Promise<Dizionario> {
  const scelta = lingua ?? (await linguaCorrente());
  const caricatore = dizionari[scelta] ?? dizionari[LINGUA_PREDEFINITA];
  return (await caricatore()).default;
}

// Sostituisce i segnaposto tipo {n} dentro una stringa tradotta.
export function riempi(testo: string, valori: Record<string, string | number>): string {
  return Object.entries(valori).reduce(
    (acc, [chiave, valore]) => acc.replaceAll(`{${chiave}}`, String(valore)),
    testo,
  );
}
