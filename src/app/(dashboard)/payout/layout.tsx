import { getCurrentMember, supabaseConfigured } from "@/lib/current-member";
import { IncaricatoOnlyNotice } from "@/components/incaricato-only-notice";
import { PayoutNav } from "./payout-nav";

export default async function PayoutLayout({ children }: LayoutProps<"/payout">) {
  const member = supabaseConfigured() ? await getCurrentMember() : null;
  const isCliente = member?.role === "cliente";

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Payout</h1>
      <p className="text-gray-500 dark:text-gray-400 mt-1">
        Richieste e storico dei pagamenti delle tue commissioni.
      </p>

      <div className="mt-6">
        {isCliente ? (
          <IncaricatoOnlyNotice />
        ) : (
          <>
            <PayoutNav />
            <div className="mt-6">{children}</div>
          </>
        )}
      </div>
    </div>
  );
}
