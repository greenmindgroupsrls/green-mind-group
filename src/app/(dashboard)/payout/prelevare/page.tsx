import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/current-member";
import { loadNetworkData } from "@/lib/load-network-data";
import { computeAvailableBalance } from "@/lib/payout-data";
import { formatActivityCode } from "@/lib/activity-code";
import {
  WITHDRAWAL_STATUS_LABEL,
  WITHDRAWAL_STATUS_BADGE_CLASS,
  type WithdrawalRequest,
} from "@/lib/withdrawals";
import { MOCK_WITHDRAWALS } from "@/lib/mock-withdrawals";
import { WithdrawForm } from "./withdraw-form";
import { WithdrawalStatusActions } from "./withdrawal-status-actions";

function formatEuro(value: number) {
  return value.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function PayoutPrelevarePage() {
  const [currentMember, network] = await Promise.all([getCurrentMember(), loadNetworkData()]);
  const code = network.usingMockData ? 0 : (currentMember?.activity_code ?? 0);
  const isRoot = code === 0;

  let withdrawals: WithdrawalRequest[];
  let profileComplete = true;
  if (network.usingMockData) {
    withdrawals = MOCK_WITHDRAWALS;
  } else {
    const supabase = await createClient();
    const [{ data }, { data: complete }] = await Promise.all([
      supabase.from("withdrawal_requests").select("*").order("created_at", { ascending: false }),
      supabase.rpc("is_profile_complete"),
    ]);
    withdrawals = (data ?? []) as WithdrawalRequest[];
    profileComplete = complete ?? false;
  }

  const availableBalance = computeAvailableBalance(network.entries, withdrawals, code);
  const myRequests = withdrawals.filter((w) => w.activity_code === code);
  const memberByCode = new Map(network.members.map((m) => [m.activity_code, m]));

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
          <h2 className="font-semibold text-gray-900 dark:text-white">Richiedi un prelievo</h2>
        </div>
        <div className="p-6">
          {network.loadFailed ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Il modulo di richiesta non è disponibile finché i tuoi dati non vengono caricati
              correttamente.
            </p>
          ) : profileComplete ? (
            <WithdrawForm availableBalance={availableBalance} />
          ) : (
            <p className="rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 text-sm px-4 py-2">
              Completa i dati del tuo profilo (telefono, data di nascita, codice
              fiscale/Partita IVA) prima di poter richiedere un prelievo.{" "}
              <Link href="/impostazioni" className="underline font-medium">
                Vai alle impostazioni profilo
              </Link>
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10">
          <h2 className="font-semibold text-gray-900 dark:text-white">Le tue richieste</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                <th className="px-6 py-2 font-medium">Importo</th>
                <th className="px-6 py-2 font-medium">IBAN</th>
                <th className="px-6 py-2 font-medium">Stato</th>
                <th className="px-6 py-2 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {myRequests.map((w) => (
                <tr key={w.id} className="border-t border-gray-100 dark:border-white/5">
                  <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">
                    {formatEuro(w.net_amount)}
                  </td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{w.iban}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`text-xs font-medium rounded-full px-2.5 py-1 ${WITHDRAWAL_STATUS_BADGE_CLASS[w.status]}`}
                    >
                      {WITHDRAWAL_STATUS_LABEL[w.status]}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                    {formatDate(w.created_at)}
                  </td>
                </tr>
              ))}
              {myRequests.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400 dark:text-gray-500">
                    Nessuna richiesta di prelievo ancora.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isRoot && (
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10">
            <h2 className="font-semibold text-gray-900 dark:text-white">Richieste da gestire</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Tutte le richieste di prelievo della rete
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                  <th className="px-6 py-2 font-medium">Utente</th>
                  <th className="px-6 py-2 font-medium">Importo</th>
                  <th className="px-6 py-2 font-medium">Banca / IBAN</th>
                  <th className="px-6 py-2 font-medium">Stato</th>
                  <th className="px-6 py-2 font-medium">Data</th>
                  <th className="px-6 py-2 font-medium">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => {
                  const requester = memberByCode.get(w.activity_code);
                  return (
                    <tr key={w.id} className="border-t border-gray-100 dark:border-white/5">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 dark:text-white">
                            {requester?.username ?? "—"}
                          </span>
                          <span className="inline-flex items-center rounded-md bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 text-xs font-medium px-2 py-0.5">
                            {formatActivityCode(w.activity_code)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">
                        {formatEuro(w.net_amount)}
                      </td>
                      <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                        {w.bank_name} — {w.iban}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`text-xs font-medium rounded-full px-2.5 py-1 ${WITHDRAWAL_STATUS_BADGE_CLASS[w.status]}`}
                        >
                          {WITHDRAWAL_STATUS_LABEL[w.status]}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                        {formatDate(w.created_at)}
                      </td>
                      <td className="px-6 py-3">
                        {w.status === "pending" ? (
                          <WithdrawalStatusActions id={w.id} />
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {withdrawals.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400 dark:text-gray-500">
                      Nessuna richiesta di prelievo ancora.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
