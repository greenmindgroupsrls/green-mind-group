import { getCurrentMember, supabaseConfigured } from "@/lib/current-member";
import { IncaricatoOnlyNotice } from "@/components/incaricato-only-notice";
import { MarketingNav } from "./marketing-nav";
import { getDizionario } from "@/i18n/dizionario";

export default async function MarketingLayout({ children }: LayoutProps<"/marketing">) {
  const T = (await getDizionario()).marketing;
  const TS = (await getDizionario()).sezioni;
  const member = supabaseConfigured() ? await getCurrentMember() : null;
  const isCliente = member?.role === "cliente";
  const isRoot = member?.activity_code === 0;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{T.titolo}</h1>
      <p className="text-gray-600 dark:text-gray-300 mt-1">
        {TS.marketing}
      </p>

      <div className="mt-6">
        {isCliente ? (
          <IncaricatoOnlyNotice />
        ) : (
          <>
            <MarketingNav isRoot={isRoot} />
            <div className="mt-6">{children}</div>
          </>
        )}
      </div>
    </div>
  );
}
