import Link from "next/link";

export const metadata = { title: "Termini e Condizioni — Green Mind Group" };

export default function TerminiPage() {
  return (
    <div className="min-h-screen bg-background flex justify-center px-6 py-16">
      <div className="w-full max-w-3xl">
        <Link href="/login" className="text-sm text-accent font-medium hover:underline">
          ← Torna al login
        </Link>

        <div className="mt-6 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] p-8 shadow-sm">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-lg px-3 py-2 mb-6">
            Bozza operativa: prima di renderla vincolante per il pubblico, fai revisionare questo
            testo da un legale.
          </p>

          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
            Termini e Condizioni
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Green Mind Group — ultimo aggiornamento: agosto 2026
          </p>

          <div className="flex flex-col gap-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            <section>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2">
                1. Accettazione dei termini
              </h2>
              <p>
                Registrandoti al back office Green Mind Group accetti integralmente i presenti
                Termini e Condizioni e la nostra{" "}
                <Link href="/privacy" className="text-accent hover:underline">
                  Privacy Policy
                </Link>
                . Se non li accetti, non puoi registrarti né utilizzare la piattaforma.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2">
                2. Natura del programma
              </h2>
              <p>
                Green Mind Group gestisce una rete commerciale di tipo unilevel. Ogni iscritto ha
                un codice sponsor (chi lo ha invitato) e una posizione strutturale nella rete,
                usata per il calcolo delle commissioni secondo le regole descritte nel back
                office. Le commissioni sono generate dalla vendita di prodotti reali, non da
                semplici iscrizioni.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2">3. Commissioni</h2>
              <p>
                Gli importi, i livelli e le condizioni di rank per il calcolo delle commissioni
                sono quelli mostrati nella sezione Payout del back office e possono essere
                aggiornati da Green Mind Group con preavviso agli iscritti attraverso la
                piattaforma o via email.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2">4. Prelievi</h2>
              <p>
                Le richieste di prelievo sono soggette a un importo minimo e a un&apos;eventuale
                commissione fissa, indicati al momento della richiesta. Il pagamento avviene
                tramite bonifico bancario sui dati forniti dall&apos;iscritto, che è l&apos;unico
                responsabile della correttezza di tali dati.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2">
                5. Acquisti sullo Shop
              </h2>
              <p>
                Gli ordini effettuati sullo Shop vengono confermati ed evasi dal team Green Mind
                Group. Per resi, garanzia e assistenza sui prodotti, contatta il Support dal back
                office.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2">
                6. Responsabilità dell&apos;iscritto
              </h2>
              <p>
                Sei responsabile della veridicità dei dati forniti in fase di registrazione e
                nella sezione Impostazioni, inclusi i documenti KYC e i dati bancari, e della
                riservatezza delle tue credenziali di accesso.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2">
                7. Modifiche ai termini
              </h2>
              <p>
                Green Mind Group può aggiornare questi termini; le modifiche sostanziali verranno
                comunicate agli iscritti tramite il back office.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2">
                8. Legge applicabile
              </h2>
              <p>
                I presenti termini sono regolati dalla legge italiana. Per qualsiasi controversia
                è competente il foro del luogo in cui ha sede Green Mind Group, salvo diversa
                previsione inderogabile di legge.
              </p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-2">9. Contatti</h2>
              <p>Per domande su questi termini, apri un ticket dalla sezione Support.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
