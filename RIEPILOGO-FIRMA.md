# Firma dei documenti nel back office

Lavoro fatto il 12/09/2026 sul branch `firma-documenti`. **Niente è stato
pubblicato**: nessuna migrazione applicata sul database reale, nessun deploy,
nessun push.

## Cosa c'è adesso

**Menu → Documenti** (visibile agli incaricati). Da lì si compila uno dei
quattro moduli, si raccolgono le firme e il PDF firmato resta archiviato.

1. **Moduli di compilazione** — contratto di vendita VORTIX, informativa
   privacy e consensi, verbale di consegna e installazione, contratto
   incaricato. I campi di ogni modulo sono descritti in un punto solo
   (`src/lib/documento-campi.ts`), da cui vengono sia il modulo a schermo sia
   il PDF: aggiungere una domanda non richiede di toccare tre file.
   Il contratto mostra il totale mentre si spuntano consegna e installazione
   (1.390 o 1.490 € + 15 € consegna + 49 € installazione).
2. **Pulsante Firma** — apre un riquadro a tutto schermo dove si firma col
   dito. Funziona su tablet e telefono (eventi pointer, niente scorrimento
   della pagina mentre si disegna, tratto ad alta risoluzione). La firma esce
   in PNG con sfondo trasparente.
3. **Due modi di firmare**, come richiesto:
   - sul dispositivo dell'incaricato, durante l'appuntamento;
   - dal telefono del cliente: riceve un link via email, valido 72 ore, e per
     firmare deve digitare un codice di 6 cifre inviato alla sua casella. Il
     codice scade in 15 minuti e dopo 5 tentativi va richiesto di nuovo.
4. **Firma nel documento** — ogni firma finisce al posto giusto secondo il
   documento: cliente e incaricato sul contratto di vendita, solo cliente
   sull'informativa, cliente e tecnico sul verbale, incaricato sul contratto
   di incarico.
5. **Archivio** — il PDF va in un bucket privato di Supabase, con l'impronta
   SHA-256 registrata. Si scarica da **Centro di controllo → Esportazioni →
   Documenti firmati**, accanto ai CSV, filtrabile per mese.
6. **Copia al cliente** — quando il documento si chiude, il PDF parte via
   email al cliente (serve al contratto, che gli promette una copia).

## Cosa resta da fare (nell'ordine)

1. **Applicare la migrazione** `supabase/migrations/0079_documenti_firmati.sql`
   sul progetto Supabase reale (`chuecjggornylvgwzyzn`). Crea le tabelle
   `signed_documents`, `document_signatures`, `document_sign_links`,
   `document_counters`, il bucket privato `documenti-firmati` e le funzioni.
2. **Controllare il bucket**: la migrazione lo crea, ma vale la pena
   verificare in Storage che risulti privato.
3. **Verificare che `SUPABASE_SERVICE_ROLE_KEY` sia su Vercel**: senza,
   la firma a distanza non parte (quella sul dispositivo funziona lo stesso).
4. **Deploy**: `git checkout main && git merge firma-documenti && git push`.
5. **Provare il giro completo** da un account incaricato reale.

## Scelte prese al posto tuo

- **Il totale si ricalcola sul server** dai prodotti scelti, non si accetta
  quello arrivato dal browser.
- **Il numero d'ordine** (`GMG-2026-0001`) usa un contatore per anno e non una
  sequence: una prova andata male non brucia un numero che il cliente
  vedrebbe mancare.
- **Chi vede i documenti**: chi li ha fatti firmare, il cliente se è a
  sistema, e l'azienda. **Non** tutta la linea ascendente: dentro ci sono
  codice fiscale e indirizzo del cliente, che non sono dati di rete.
- **La firma a distanza è solo per il cliente**: incaricato e tecnico sono sul
  posto.
- **Il testo integrale** del contratto e dell'informativa viene accodato al
  PDF prendendo i file caricati in Marketing → Documenti. Oggi gli slot
  `privacy` e `modulo_ordine` sono vuoti: finché non carichi lì i PDF nuovi,
  il documento firmato contiene i dati e le clausole essenziali, ma non il
  testo completo.
- **I dati aziendali mancanti** (partita IVA, REA, capitale sociale, telefono,
  IBAN, banca, nome amministratore, garanzia N.T.A., finanziaria) stanno tutti
  in `src/lib/azienda.ts` e compaiono come `XXXXXXXXX`. La pagina Documenti
  avvisa quali mancano prima che qualcuno stampi un contratto così.

## Cosa è stato verificato davvero

- `npx tsc --noEmit` e `npx eslint`: puliti.
- `npx next build`: completata; le rotte nuove (`/documenti`,
  `/documenti/[id]`, `/documenti/nuovo/[tipo]`, `/firma/[token]`,
  `/api/documenti/[id]/pdf`, `/api/admin/export/documenti`) sono nella build.
- **PDF generato davvero** con dati di esempio e due firme, e guardato pagina
  per pagina: intestazione, dati, totale corretto (1.554 €), clausole su
  recesso, garanzia e art. 107, firme al posto giusto con data, ora e IP.

**Non** è stato provato con il database reale (nessuna migrazione applicata):
il giro completo — creazione, firma, email, archiviazione — va provato dopo il
punto 1.

## Punti da decidere con un legale

- La firma raccolta è una **firma elettronica semplice**: vale come prova ma
  è liberamente valutabile dal giudice. Per i contratti importanti valuta se
  passare a una firma elettronica avanzata.
- L'art. 1341 c.c. chiede l'approvazione specifica **per iscritto** delle
  clausole onerose: per i clienti professionisti la doppia firma va raccolta
  come firma separata, non come spunta (oggi il modulo non la distingue).
