import { SupportNav } from "./support-nav";
import { getDizionario } from "@/i18n/dizionario";

export default async function SupportLayout({ children }: LayoutProps<"/support">) {
  const T = (await getDizionario()).supporto;
  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{T.titolo}</h1>
      <p className="text-gray-600 dark:text-gray-300 mt-1">
        {T.sottotitolo}
      </p>

      <div className="mt-6">
        <SupportNav />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
