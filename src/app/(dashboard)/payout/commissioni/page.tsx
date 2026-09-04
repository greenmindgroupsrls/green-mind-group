import { Wallet, Clock, Banknote, TrendingUp } from "lucide-react";
import { getCurrentMember } from "@/lib/current-member";
import { loadNetworkData } from "@/lib/load-network-data";
import { buildWalletOverview, buildCommissionRows } from "@/lib/payout-data";
import { formatActivityCode } from "@/lib/activity-code";
import { StatCard } from "@/components/stat-card";
import { ExportCsvButton } from "./export-csv-button";
import { etichettaProvvigione, coloreProvvigione } from "@/lib/piano-compensi";

function formatEuro(value: number) {
  return value.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PayoutCommissioniPage() {
  const [currentMember, network] = await Promise.all([getCurrentMember(), loadNetworkData()]);
  const code = network.usingMockData ? 0 : (currentMember?.activity_code ?? 0);

  const overview = buildWalletOverview(network.entries, code);
  // Tutto quello che non e' la propria vendita diretta: i livelli del piano
  // vecchio, il pass-up e la quota del Royal Pool del Sistema 2.
  const totalCommissions =
    overview.byLevel[1] + overview.byLevel[2] + overview.byLevel[3] + overview.byLevel[4] + overview.byLevel[5];
  const rows = buildCommissionRows(network.entries, network.sales, network.members, code);

  return (
    <div className="flex flex-col gap-6">
      {network.usingMockData && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 text-sm px-4 py-2">
          Supabase non ancora collegato: questi sono dati di esempio a scopo dimostrativo.
        </div>
      )}
      {network.loadFailed && (
        <div className="rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-sm px-4 py-2">
          Non è stato possibile caricare i tuoi dati in questo momento. Ricarica la pagina o riprova tra poco.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Wallet} label="Saldo disponibile" value={formatEuro(totalCommissions)} tone="accent" />
        <StatCard icon={Clock} label="Commissioni in sospeso" value={formatEuro(0)} tone="amber" />
        <StatCard icon={Banknote} label="Prelievi totali" value={formatEuro(0)} tone="rose" />
        <StatCard icon={TrendingUp} label="Guadagni totali" value={formatEuro(totalCommissions)} tone="emerald" />
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Movimenti commissioni</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Chi ha generato la vendita, sotto quale forma di commissione e quanto hai ricevuto
            </p>
          </div>
          <ExportCsvButton rows={rows} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                <th className="px-6 py-2 font-medium">#</th>
                <th className="px-6 py-2 font-medium">Utente</th>
                <th className="px-6 py-2 font-medium">Categoria</th>
                <th className="px-6 py-2 font-medium text-right">Importo</th>
                <th className="px-6 py-2 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-t border-gray-100 dark:border-white/5">
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{i + 1}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-medium px-2 py-0.5">
                        {r.sellerUsername}
                      </span>
                      <span className="inline-flex items-center rounded-md bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 text-xs font-medium px-2 py-0.5">
                        {formatActivityCode(r.sellerCode)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`text-xs font-medium rounded-full px-2.5 py-1 ${coloreProvvigione(r.kind, r.level)}`}
                    >
                      {etichettaProvvigione(r.kind, r.level)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-gray-900 dark:text-white">
                    {formatEuro(r.amount)}
                  </td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                    {formatDate(r.createdAt)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400 dark:text-gray-500">
                    Nessuna commissione ricevuta finora.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
