import Link from "next/link";
import { ShoppingBag, Rocket } from "lucide-react";
import { getDizionario, riempi } from "@/i18n/dizionario";

// Dashboard ridotta per chi si è registrato come Cliente: niente Team,
// Marketing, Payout, Registrazione — solo l'essenziale per acquistare, più
// l'invito ben visibile a passare a Incaricato quando vuole.
export async function ClientDashboard({ username }: { username: string }) {
  const T = (await getDizionario()).cliente;

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{riempi(T.saluto, { nome: username })}</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          {T.sottotitolo}
        </p>
      </div>

      <div className="glass-card p-4 sm:p-6 flex flex-col items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
          <ShoppingBag size={20} />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">{T.catalogoTitolo}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {T.catalogoTesto}
          </p>
        </div>
        <Link
          href="/shop"
          className="glass-btn-primary rounded-lg px-4 py-2.5 text-sm font-medium"
        >
          {T.catalogoLink}
        </Link>
      </div>

      <div className="rounded-xl border border-accent/30 bg-accent/5 p-6 shadow-sm flex flex-col items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
          <Rocket size={20} />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">{T.distributoreTitolo}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {T.distributoreTesto}
          </p>
        </div>
        <Link
          href="/diventa-incaricato"
          className="glass-btn-primary rounded-lg px-4 py-2.5 text-sm font-medium"
        >
          {T.distributoreTitolo}
        </Link>
      </div>
    </div>
  );
}
