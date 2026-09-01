import { PiggyBank, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/current-member";
import { loadNetworkData } from "@/lib/load-network-data";
import { buildWalletOverview } from "@/lib/payout-data";
import { DonutChart } from "@/components/charts/donut-chart";
import { MOCK_WITHDRAWALS } from "@/lib/mock-withdrawals";
import type { WithdrawalRequest } from "@/lib/withdrawals";

function formatEuro(value: number) {
  return value.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

export default async function PayoutOverviewPage() {
  const [currentMember, network] = await Promise.all([getCurrentMember(), loadNetworkData()]);
  const code = network.usingMockData ? 0 : (currentMember?.activity_code ?? 0);

  const overview = buildWalletOverview(network.entries, code);

  let withdrawals: WithdrawalRequest[];
  if (network.usingMockData) {
    withdrawals = MOCK_WITHDRAWALS;
  } else {
    const supabase = await createClient();
    const { data } = await supabase.from("withdrawal_requests").select("*").eq("activity_code", code);
    withdrawals = (data ?? []) as WithdrawalRequest[];
  }

  const myWithdrawals = withdrawals.filter((w) => w.activity_code === code);
  const pendingWithdrawals = myWithdrawals
    .filter((w) => w.status === "pending")
    .reduce((sum, w) => sum + w.net_amount, 0);
  const paidWithdrawals = myWithdrawals
    .filter((w) => w.status === "paid")
    .reduce((sum, w) => sum + w.net_amount, 0);

  // Acquisti/oneri: nessun concetto ancora nel sistema (niente tracciamento
  // acquisti, nessuna gestione tasse separata) — a zero finché non
  // decidiamo come organizzare questi dati, come da richiesta esplicita
  // dell'utente. Prelievi/Utile netto invece sono ora reali, collegati a
  // withdrawal_requests.
  const totalPurchases = 0;
  const totalPayouts = pendingWithdrawals + paidWithdrawals;
  const taxAndCharges = 0;
  const netBenefits = overview.totalEarnings - totalPayouts - taxAndCharges;
  const availableBalance = overview.totalEarnings - totalPayouts;

  const rows = [
    { abbr: "AT", label: "Acquisti totali", value: totalPurchases, dot: "bg-orange-500", color: "#f97316" },
    { abbr: "GT", label: "Guadagni totali", value: overview.totalEarnings, dot: "bg-accent", color: "var(--accent)" },
    { abbr: "PT", label: "Prelievi totali", value: totalPayouts, dot: "bg-blue-500", color: "#3b82f6" },
    { abbr: "TO", label: "Tasse e oneri", value: taxAndCharges, dot: "bg-rose-500", color: "#f43f5e" },
    { abbr: "UN", label: "Utile netto", value: netBenefits, dot: "bg-amber-500", color: "#f59e0b" },
  ];

  const categoryBreakdown = [
    { label: "Vendita diretta", value: overview.byLevel[0] },
    { label: "Commissione Livello 1", value: overview.byLevel[1] },
    { label: "Commissione Livello 2", value: overview.byLevel[2] },
    { label: "Commissione Livello 3", value: overview.byLevel[3] },
  ];

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

      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10">
          <h2 className="font-semibold text-gray-900 dark:text-white">Panoramica</h2>
        </div>
        <div className="flex flex-col lg:flex-row items-center gap-8 p-6">
          <div className="flex-1 w-full flex flex-col divide-y divide-gray-100 dark:divide-white/5">
            {rows.map((r) => (
              <div key={r.abbr} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`h-8 w-8 rounded-md ${r.dot} text-white text-[11px] font-bold flex items-center justify-center shrink-0`}
                  >
                    {r.abbr}
                  </span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {r.label}
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatEuro(r.value)}
                </span>
              </div>
            ))}
          </div>

          <DonutChart
            data={rows.map((r) => ({ label: r.label, value: r.value, color: r.color }))}
            centerLabel="Guadagni totali"
            centerValue={formatEuro(overview.totalEarnings)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center gap-2">
            <Wallet size={18} className="text-accent" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Portafoglio commissioni</h2>
          </div>
          <div className="p-6 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center text-accent shrink-0">
                <PiggyBank size={24} />
              </div>
              <div>
                <p className="text-3xl font-bold text-accent">{formatEuro(availableBalance)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Saldo disponibile</p>
              </div>
            </div>
            <div className="flex flex-col divide-y divide-gray-100 dark:divide-white/5">
              {[
                { label: "Guadagni totali", value: overview.totalEarnings },
                { label: "Totale addebiti", value: totalPayouts },
                { label: "Prelievi in sospeso", value: pendingWithdrawals },
                { label: "Prelievi completati", value: paidWithdrawals },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-gray-600 dark:text-gray-300">{r.label}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatEuro(r.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10">
            <h2 className="font-semibold text-gray-900 dark:text-white">Riepilogo per categoria</h2>
          </div>
          <div className="p-6 flex flex-col divide-y divide-gray-100 dark:divide-white/5">
            {categoryBreakdown.map((r) => (
              <div key={r.label} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-gray-600 dark:text-gray-300">{r.label}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatEuro(r.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
