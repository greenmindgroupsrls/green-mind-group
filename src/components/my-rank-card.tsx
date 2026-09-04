"use client";

import { useMemo } from "react";
import { Crown, TrendingUp } from "lucide-react";
import type { Member } from "@/lib/members";
import { RANK_LABEL, type Rank } from "@/lib/rank";

const RANK_STYLE: Record<Rank, { badge: string; icona: string; barra: string }> = {
  standard: {
    badge: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300",
    icona: "text-gray-500 dark:text-gray-400",
    barra: "bg-gray-400",
  },
  vip: {
    badge: "bg-accent/10 text-accent",
    icona: "text-accent",
    barra: "bg-accent",
  },
  royal: {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    icona: "text-amber-500",
    barra: "bg-amber-500",
  },
};

// Le soglie replicano il Sistema 2 nel database (vedi migration
// 0059_piano_compensi_sistema2.sql):
//   VIP   -> aver ceduto al VIP superiore le prime 2 vendite qualificanti.
//   ROYAL -> 10 VIP agganciati direttamente sotto di se' nella struttura,
//            compresi quelli arrivati per eredita' dai pass-up.
// Sono le stesse soglie del database: se cambiano la', vanno cambiate qui.
const VENDITE_PER_VIP = 2;
const VIP_PER_ROYAL = 10;

export function MyRankCard({
  members,
  ranks,
  rootCode,
}: {
  members: Member[];
  ranks: Record<number, Rank>;
  rootCode: number;
}) {
  const mioRank: Rank = ranks[rootCode] ?? "standard";
  const stile = RANK_STYLE[mioRank];

  const progresso = useMemo(() => {
    const io = members.find((m) => m.activity_code === rootCode);
    const cedute = io?.passed_up_count ?? 0;

    // Royal si conta sui diretti nella STRUTTURA, non su chi si e' iscritto
    // di persona: dopo un pass-up l'ereditato diventa un diretto a tutti gli
    // effetti, ed e' cosi' che lo conta anche il database.
    const vipDiretti = members.filter(
      (m) =>
        m.parent_code === rootCode &&
        (ranks[m.activity_code] === "vip" || ranks[m.activity_code] === "royal"),
    ).length;

    return { cedute, vipDiretti };
  }, [members, ranks, rootCode]);

  // Obiettivo successivo: da Standard si punta a VIP, da VIP a Royal.
  // Il traguardo si ricava SEMPRE dal rank reale, mai da isRoot: altrimenti
  // basta un rank forzato a mano dal Centro di controllo per far dire alla
  // scheda una cosa e al badge un'altra.
  const obiettivo =
    !progresso || mioRank === "royal"
      ? null
      : mioRank === "standard"
        ? {
            verso: "VIP",
            attuale: progresso.cedute,
            totale: VENDITE_PER_VIP,
            cosa: "vendite di qualifica cedute",
            nota: "Le prime due vendite vanno al VIP sopra di te. Dopo sei libero: i tuoi iscritti restano tuoi.",
          }
        : {
            verso: "Royal",
            attuale: progresso.vipDiretti,
            totale: VIP_PER_ROYAL,
            cosa: "VIP diretti nella tua struttura",
            nota: "Con 10 VIP diretti entri nel Royal Pool.",
          };

  const percentuale = obiettivo
    ? Math.min(100, Math.round((obiettivo.attuale / obiettivo.totale) * 100))
    : 100;

  return (
    <div className="glass-card p-6">
      <h2 className="font-semibold text-gray-900 dark:text-white">Il tuo rank</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">La tua posizione nel programma</p>

      <div className="flex items-center gap-3 mt-4">
        <div
          className={`h-12 w-12 rounded-xl flex items-center justify-center ${stile.badge}`}
        >
          <Crown size={24} className={stile.icona} />
        </div>
        <div>
          <span
            className={`inline-block text-base font-bold rounded-lg px-3 py-1 ${stile.badge}`}
          >
            {RANK_LABEL[mioRank]}
          </span>
        </div>
      </div>

      {obiettivo ? (
        <div className="mt-5 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
              <TrendingUp size={14} className="text-gray-500 dark:text-gray-400" />
              Verso <strong className="text-gray-900 dark:text-white">{obiettivo.verso}</strong>
            </span>
            <span className="font-semibold text-gray-900 dark:text-white tabular-nums">
              {obiettivo.attuale} / {obiettivo.totale}
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${stile.barra}`}
              style={{ width: `${percentuale}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {obiettivo.cosa}
            {obiettivo.nota && (
              <>
                <br />
                <span className="text-amber-700 dark:text-amber-400">{obiettivo.nota}</span>
              </>
            )}
          </p>
        </div>
      ) : (
        <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">
          Hai raggiunto il livello più alto del programma e partecipi al Royal Pool.
          {rootCode === 0 && " L'account aziendale è sempre Royal."}
        </p>
      )}
    </div>
  );
}
