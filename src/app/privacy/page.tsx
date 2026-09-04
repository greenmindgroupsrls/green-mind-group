import Link from "next/link";

export const metadata = { title: "Privacy Policy — Green Mind Group" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background flex justify-center px-6 py-16">
      <div className="w-full max-w-3xl">
        <Link href="/login" className="text-sm text-accent font-medium hover:underline">
          ← Torna al login
        </Link>

        <div className="mt-6 glass-card p-8">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-lg px-3 py-2 mb-6">
            Bozza operativa: prima di renderla vincolante per il pubblico, fai revisionare questo
            testo da un legale (in particolare la nomina del Titolare del trattamento e i
            riferimenti di contatto).
          </p>

          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
            Privacy Policy
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Green Mind Group — ultimo aggiornamento: agosto 2026
          </p>

          <div className="flex flex-col gap-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            <section>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2">
                1. Titolare del trattamento
              </h2>
              <p>
                Green Mind Group è il Titolare del trattamento dei dati raccolti attraverso questo
                back office.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2">
                2. Dati raccolti
              </h2>
              <p>In base a come usi la piattaforma, possiamo raccogliere:</p>
              <ul className="list-disc pl-5 mt-2 flex flex-col gap-1">
                <li>Dati anagrafici e di contatto (nome, cognome, email, telefono, paese)</li>
                <li>Dati aziendali, se ti registri come azienda (ragione sociale, partita IVA)</li>
                <li>Documenti di identità e KYC caricati in Impostazioni</li>
                <li>Indirizzi di spedizione e fatturazione</li>
                <li>Dati bancari (IBAN) forniti per le richieste di prelievo</li>
                <li>Dati di rete: chi ti ha invitato, la tua posizione nella struttura, vendite e commissioni</li>
                <li>Messaggi scambiati con altri iscritti e ticket di assistenza</li>
              </ul>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2">
                3. Finalità del trattamento
              </h2>
              <p>
                Usiamo questi dati per gestire la tua iscrizione, calcolare le commissioni,
                evadere gli ordini dello Shop, elaborare le richieste di prelievo, verificare la
                tua identità (KYC) e fornirti assistenza. Non vendiamo i tuoi dati a terzi.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2">
                4. Base giuridica e conservazione
              </h2>
              <p>
                Trattiamo i tuoi dati per l&apos;esecuzione del rapporto contrattuale tra te e
                Green Mind Group e per obblighi di legge (es. conservazione dei dati fiscali). I
                dati vengono conservati per la durata del rapporto e per il tempo richiesto dalla
                normativa applicabile.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2">
                5. Visibilità dei dati all&apos;interno della rete
              </h2>
              <p>
                Il tuo sponsor e i membri della tua struttura possono vedere il tuo username, il
                tuo codice attività, il tuo rank e i volumi generati. Indirizzi, documenti KYC e
                dati bancari restano visibili solo a te e all&apos;azienda, mai al resto della
                rete.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2">
                6. I tuoi diritti
              </h2>
              <p>
                Puoi accedere, correggere o richiedere la cancellazione dei tuoi dati, salvo
                obblighi di legge che ne impongano la conservazione. Per esercitare questi diritti,
                apri un ticket dalla sezione Support.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2">
                7. Sicurezza
              </h2>
              <p>
                I dati sono conservati su infrastruttura Supabase con accesso protetto da
                autenticazione e regole di sicurezza a livello di riga (Row Level Security), che
                limitano l&apos;accesso ai soli dati che ti riguardano.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2">8. Contatti</h2>
              <p>Per domande sul trattamento dei tuoi dati, apri un ticket dalla sezione Support.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
