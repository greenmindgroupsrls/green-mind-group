"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Euro, Package, Users, Crown, Wallet } from "lucide-react";
import type { Member } from "@/lib/members";
import type { Sale, CommissionEntry } from "@/lib/commissions";
import { buildDashboardData } from "@/lib/dashboard-data";
import { RANK_LABEL, type Rank } from "@/lib/rank";
import { formatActivityCode } from "@/lib/activity-code";
import { StatCard } from "@/components/stat-card";
import { NetworkAreaChart } from "@/components/charts/network-area-chart";
import { RankDistribution } from "@/components/charts/rank-distribution";
import { MyRankCard } from "@/components/my-rank-card";
import { PassUpLinesCard } from "@/components/pass-up-lines-card";

// La mappa mondo trascina un dataset SVG da ~1.2MB (@svg-maps/world):
// caricata solo lato client e solo quando serve, così non gonfia il bundle
// iniziale della Dashboard (che altrimenti la include sempre, anche se la
// card è sotto la piega).
const WorldMapCard = dynamic(
  () => import("@/components/charts/world-map-card").then((mod) => mod.WorldMapCard),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] p-6 shadow-sm animate-pulse">
        <div className="h-5 w-40 rounded bg-gray-100 dark:bg-white/10 mb-4" />
        <div className="h-[340px] rounded-lg bg-gray-50 dark:bg-white/5" />
      </div>
    ),
  },
);

const RANK_BADGE_CLASS: Record<Rank, string> = {
  standard: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300",
  vip: "bg-accent/10 text-accent",
  royal: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
};

function formatEuro(value: number) {
  return value.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

function formatHour(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

export function DashboardView({
  members,
  sales,
  entries,
  ranks,
  countries,
  totalRevenue,
  rootCode,
  isRoot,
  announcementsSlot,
  azioniSlot,
}: {
  members: Member[];
  sales: Sale[];
  entries: CommissionEntry[];
  ranks: Record<number, Rank>;
  countries: Record<number, string>;
  totalRevenue: number;
  rootCode: number;
  isRoot: boolean;
  announcementsSlot?: React.ReactNode;
  azioniSlot?: React.ReactNode;
}) {
  const data = useMemo(
    () => buildDashboardData(members, sales, entries, ranks, rootCode),
    [members, sales, entries, ranks, rootCode],
  );

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
      <p className="text-gray-500 dark:text-gray-400 mt-1">
        {isRoot ? "Panoramica rete e commissioni" : "Panoramica del tuo team e delle tue commissioni"}
      </p>

      {announcementsSlot && <div className="mt-6">{announcementsSlot}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mt-6">
        <StatCard
          icon={Euro}
          label="Commissioni totali"
          value={formatEuro(data.totalIncome)}
          tone="accent"
          delta={
            data.incomeDeltaPct !== null
              ? { value: `${data.incomeDeltaPct >= 0 ? "+" : ""}${data.incomeDeltaPct}%`, positive: data.incomeDeltaPct >= 0 }
              : null
          }
        />
        <StatCard
          icon={Wallet}
          label="Fatturato totale"
          value={formatEuro(totalRevenue)}
          tone="violet"
        />
        <StatCard icon={Package} label="Pezzi venduti" value={String(data.totalPiecesSold)} tone="emerald" />
        <StatCard
          icon={Users}
          label="Iscritti in rete"
          value={String(data.totalMembers)}
          tone="amber"
          delta={{
            value: `${data.signupsDelta >= 0 ? "+" : ""}${data.signupsDelta}`,
            positive: data.signupsDelta >= 0,
          }}
        />
        <StatCard
          icon={Crown}
          label="VIP + Royal"
          value={String(data.rankCounts.vip + data.rankCounts.royal)}
          tone="rose"
        />
      </div>

      {/* items-start: senza, la card del grafico si allunga fino all'altezza
          della colonna di destra e lascia sotto una fascia bianca vuota. */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 mt-4 items-start">
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 dark:text-white">Team</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Nuovi iscritti per mese</p>
            <div className="mt-4">
              <NetworkAreaChart data={data.signupSeries} />
            </div>
          </div>
          {azioniSlot}
        </div>

        <div className="flex flex-col gap-4">
          <MyRankCard members={members} ranks={ranks} rootCode={rootCode} />

          <PassUpLinesCard members={members} ranks={ranks} rootCode={rootCode} />

          <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 dark:text-white">Distribuzione rank</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Standard · VIP · Royal</p>
            <RankDistribution counts={data.rankCounts} />
          </div>
        </div>
      </div>

      <div className="mt-4">
        <WorldMapCard countries={countries} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10">
            <h2 className="font-semibold text-gray-900 dark:text-white">Ultimi iscritti</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                  <th className="px-6 py-2 font-medium">Utente</th>
                  <th className="px-6 py-2 font-medium">Rank</th>
                  <th className="px-6 py-2 font-medium">Iscritto il</th>
                </tr>
              </thead>
              <tbody>
                {data.recentReferrals.map((r) => (
                  <tr key={r.code} className="border-t border-gray-100 dark:border-white/5">
                    <td className="px-6 py-3 text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 text-xs font-medium px-2 py-0.5">
                          {formatActivityCode(r.code)}
                        </span>
                        <span>{r.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`text-xs font-medium rounded-full px-2 py-0.5 ${RANK_BADGE_CLASS[r.rank]}`}
                      >
                        {RANK_LABEL[r.rank]}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400">
                      {formatDate(r.created_at)}
                    </td>
                  </tr>
                ))}
                {data.recentReferrals.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-6 text-center text-gray-400">
                      Nessun iscritto ancora.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10">
            <h2 className="font-semibold text-gray-900 dark:text-white">Team performance</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isRoot ? "Diretti strutturali dell'azienda" : "I tuoi diretti strutturali"}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                  <th className="px-6 py-2 font-medium">Utente</th>
                  <th className="px-6 py-2 font-medium">Team</th>
                  <th className="px-6 py-2 font-medium text-right">Commissioni</th>
                </tr>
              </thead>
              <tbody>
                {data.teamPerformance.map((t) => (
                  <tr key={t.code} className="border-t border-gray-100 dark:border-white/5">
                    <td className="px-6 py-3 text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 text-xs font-medium px-2 py-0.5">
                          {formatActivityCode(t.code)}
                        </span>
                        <span>{t.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{t.teamSize}</td>
                    <td className="px-6 py-3 text-right font-medium text-gray-900 dark:text-white">
                      {formatEuro(t.earnings)}
                    </td>
                  </tr>
                ))}
                {data.teamPerformance.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-6 text-center text-gray-400">
                      Nessun diretto ancora.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10">
          <h2 className="font-semibold text-gray-900 dark:text-white">Attività di rete</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Ultime iscrizioni introdotte da te o dal tuo team, in tutta la struttura
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                <th className="px-6 py-2 font-medium">Chi ha introdotto</th>
                <th className="px-6 py-2 font-medium">Evento</th>
                <th className="px-6 py-2 font-medium">Nuovo iscritto</th>
                <th className="px-6 py-2 font-medium">Data</th>
                <th className="px-6 py-2 font-medium">Ora</th>
                <th className="px-6 py-2 font-medium text-right">Commissione</th>
              </tr>
            </thead>
            <tbody>
              {data.networkActivity.map((row) => (
                <tr key={row.key} className="border-t border-gray-100 dark:border-white/5">
                  <td className="px-6 py-3 text-gray-900 dark:text-white whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {row.sponsorCode !== null && (
                        <span className="inline-flex items-center rounded-md bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 text-xs font-medium px-2 py-0.5">
                          {formatActivityCode(row.sponsorCode)}
                        </span>
                      )}
                      <span>{row.sponsorName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-xs font-medium rounded-full px-2 py-0.5 bg-accent/10 text-accent whitespace-nowrap">
                      {row.eventLabel}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-900 dark:text-white whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 text-xs font-medium px-2 py-0.5">
                        {formatActivityCode(row.memberCode)}
                      </span>
                      <span>{row.memberName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formatDate(row.created_at)}
                  </td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {formatHour(row.created_at)}
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    {row.amount !== null
                      ? row.amount.toLocaleString("it-IT", { style: "currency", currency: "EUR" })
                      : "—"}
                  </td>
                </tr>
              ))}
              {data.networkActivity.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400 dark:text-gray-500">
                    Nessuna attività ancora.
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
