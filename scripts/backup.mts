// Copia di sicurezza completa e scaricabile del progetto.
//
// Perche' serve: sul piano gratuito Supabase non fa backup. Lo schema del
// database e' gia' al sicuro (le migrazioni sono in git), ma i DATI e i FILE
// caricati vivono solo sul server. Questo script se li porta a casa.
//
// Uso:
//   npm run backup
//
// Richiede la chiave di servizio di Supabase in un file .env.backup (che git
// ignora). La chiave si prende una volta sola da:
//   Supabase > Project Settings > API > service_role
//
// La cartella prodotta contiene dati personali (codici fiscali, IBAN,
// documenti d'identita'): tienila su un disco che consideri riservato.

import { writeFileSync, mkdirSync, readFileSync, existsSync, cpSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");

function leggiEnv(file: string): Record<string, string> {
  const percorso = join(radice, file);
  if (!existsSync(percorso)) return {};
  const out: Record<string, string> = {};
  for (const riga of readFileSync(percorso, "utf8").split("\n")) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/.exec(riga);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...leggiEnv(".env.local"), ...leggiEnv(".env.backup"), ...process.env };
const URL_SUPABASE = env.NEXT_PUBLIC_SUPABASE_URL;
const CHIAVE = env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_SUPABASE) {
  console.error("Manca NEXT_PUBLIC_SUPABASE_URL (dovrebbe essere in .env.local).");
  process.exit(1);
}
const percorsoChiave = join(radice, ".env.backup");

// Se la chiave non c'e' la si chiede qui e la si salva: cosi' chi usa lo
// script non deve creare file a mano ne' sapere dove vanno messi.
async function chiediChiave(): Promise<string> {
  console.log(
    "\nPrima volta: serve la chiave segreta di Supabase.\n\n" +
      "Dove si prende:\n" +
      "  1. Vai su supabase.com ed entra nel progetto\n" +
      "  2. Ingranaggio in fondo alla colonna di sinistra (Project Settings)\n" +
      "  3. Voce API Keys\n" +
      "  4. Copia la chiave SEGRETA: si chiama 'secret' (inizia per sb_secret_)\n" +
      "     oppure 'service_role' (lunghissima, inizia per eyJ)\n" +
      "     NON quella 'anon' o 'publishable': quella e' pubblica e non funziona\n",
  );
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const risposta = (await rl.question("Incolla qui la chiave e premi INVIO: ")).trim();
  rl.close();
  if (!risposta) {
    console.error("\nNessuna chiave inserita. Rilancia quando ce l'hai sottomano.");
    process.exit(1);
  }
  writeFileSync(percorsoChiave, `SUPABASE_SERVICE_ROLE_KEY=${risposta}\n`);
  console.log("\nChiave salvata. Le prossime volte non te la chiedero' piu'.\n");
  return risposta;
}

const chiave = CHIAVE ?? (await chiediChiave());
const intestazioni = { apikey: chiave, Authorization: `Bearer ${chiave}` };

const stamp = new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "");
const destinazione = env.BACKUP_DIR ?? join(radice, "..", "backup-green-mind-group", stamp);

class ChiaveRifiutata extends Error {}

async function chiedi(url: string, opzioni: RequestInit = {}) {
  const r = await fetch(url, { ...opzioni, headers: { ...intestazioni, ...(opzioni.headers ?? {}) } });
  if (r.status === 401 || r.status === 403) throw new ChiaveRifiutata();
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} su ${url}`);
  return r;
}

// --- tabelle ---------------------------------------------------------------
// L'elenco non e' scritto a mano: lo si chiede a Supabase, cosi' una tabella
// nuova finisce nel backup senza che nessuno debba ricordarsi di aggiungerla.
async function elencoTabelle(): Promise<string[]> {
  const spec = await (await chiedi(`${URL_SUPABASE}/rest/v1/`)).json();
  return Object.keys(spec.definitions ?? spec.components?.schemas ?? {}).sort();
}

async function salvaTabelle() {
  const tabelle = await elencoTabelle();
  mkdirSync(join(destinazione, "dati"), { recursive: true });
  const conteggi: Record<string, number> = {};
  for (const tabella of tabelle) {
    const righe = await (
      await chiedi(`${URL_SUPABASE}/rest/v1/${encodeURIComponent(tabella)}?select=*`)
    ).json();
    writeFileSync(join(destinazione, "dati", `${tabella}.json`), JSON.stringify(righe, null, 2));
    conteggi[tabella] = Array.isArray(righe) ? righe.length : 0;
  }
  return conteggi;
}

// --- file caricati ---------------------------------------------------------
async function elencoOggetti(bucket: string, prefisso = ""): Promise<string[]> {
  const r = await chiedi(`${URL_SUPABASE}/storage/v1/object/list/${bucket}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: prefisso, limit: 1000, offset: 0 }),
  });
  const voci = (await r.json()) as { name: string; id: string | null }[];
  const risultato: string[] = [];
  for (const voce of voci) {
    const percorso = prefisso ? `${prefisso}/${voce.name}` : voce.name;
    // id nullo = e' una cartella, non un file: si scende dentro
    if (voce.id === null) risultato.push(...(await elencoOggetti(bucket, percorso)));
    else risultato.push(percorso);
  }
  return risultato;
}

async function salvaFile() {
  const bucket = (await (await chiedi(`${URL_SUPABASE}/storage/v1/bucket`)).json()) as {
    id: string;
  }[];
  const conteggi: Record<string, number> = {};
  for (const b of bucket) {
    const oggetti = await elencoOggetti(b.id);
    for (const percorso of oggetti) {
      const dati = Buffer.from(
        await (await chiedi(`${URL_SUPABASE}/storage/v1/object/${b.id}/${percorso}`)).arrayBuffer(),
      );
      const destino = join(destinazione, "file", b.id, percorso);
      mkdirSync(dirname(destino), { recursive: true });
      writeFileSync(destino, dati);
    }
    conteggi[b.id] = oggetti.length;
  }
  return conteggi;
}

// --- esecuzione ------------------------------------------------------------
// Una chiave sbagliata e' l'errore piu' probabile: invece di lasciare un
// messaggio tecnico si cancella quella salvata, cosi' al giro dopo lo script
// la richiede di nuovo da solo.
process.on("uncaughtException", (e) => {
  if (e instanceof ChiaveRifiutata) {
    if (existsSync(percorsoChiave)) rmSync(percorsoChiave);
    console.error(
      "\nLa chiave non e' stata accettata da Supabase.\n" +
        "Probabilmente era quella pubblica ('anon') invece di quella segreta.\n" +
        "L'ho cancellata: rilancia il backup e te ne chiedera' una nuova.\n",
    );
  } else {
    console.error(`\nQualcosa non ha funzionato: ${e.message}\n`);
  }
  process.exit(1);
});

console.log(`Copia di sicurezza in corso...\n  destinazione: ${destinazione}\n`);

const tabelle = await salvaTabelle();
const righeTotali = Object.values(tabelle).reduce((a, b) => a + b, 0);
console.log(`  tabelle: ${Object.keys(tabelle).length} (${righeTotali} righe in tutto)`);

const file = await salvaFile();
const fileTotali = Object.values(file).reduce((a, b) => a + b, 0);
console.log(`  file caricati: ${fileTotali}`);

// Lo schema: le migrazioni ricostruiscono il database da zero.
cpSync(join(radice, "supabase", "migrations"), join(destinazione, "schema"), { recursive: true });
console.log(`  schema: migrazioni copiate`);

const conNumeri = Object.entries(tabelle)
  .filter(([, n]) => n > 0)
  .map(([t, n]) => `  ${t}: ${n}`)
  .join("\n");

writeFileSync(
  join(destinazione, "LEGGIMI.txt"),
  `COPIA DI SICUREZZA — GREEN MIND GROUP
Eseguita il ${new Date().toLocaleString("it-IT")}

COSA C'E' DENTRO
  dati/     una cartella JSON per ogni tabella del database
  file/     i documenti e le immagini caricati, divisi per archivio
  schema/   le migrazioni che ricostruiscono la struttura del database

TABELLE CON CONTENUTO
${conNumeri || "  (nessuna)"}

FILE CARICATI
${Object.entries(file).map(([b, n]) => `  ${b}: ${n}`).join("\n") || "  (nessuno)"}

COME SI RIPARTE DA QUI
  1. Si crea un progetto Supabase nuovo.
  2. Si applicano in ordine le migrazioni in schema/.
  3. Si ricaricano i dati da dati/ e i file da file/.

ATTENZIONE
  Questa cartella contiene dati personali: nomi, email, codici fiscali,
  coordinate bancarie e documenti d'identita'. Va trattata come materiale
  riservato e non va messa su servizi condivisi senza protezione.

  Le password degli utenti NON sono qui: sono custodite da Supabase in forma
  cifrata e non sono esportabili. In un ripristino gli utenti rifanno la
  password dal link "password dimenticata".
`,
);

console.log(`\nFatto. Apri la cartella per controllare:\n  ${destinazione}\n`);
