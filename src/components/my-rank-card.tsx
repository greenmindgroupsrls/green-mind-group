"use client";

import { useMemo } from "react";
import { Crown, TrendingUp } from "lucide-react";
import type { Member } from "@/lib/members";
import type { Sale } from "@/lib/commissions";
import { RANK_LABEL, type Rank } from "@/lib/rank";

const RANK_STYLE: Record<Rank, { badge: string; icona: string; barra: string }> = {
  standard: {
    badge: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300",
    icona: "text-gray-400 dark:text-gray-500",
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

// Le soglie replicano compute_member_ranks() nel database (vedi migration
// 0034_document_actual_rank_logic.sql):
//   VIP   -> N diretti che hanno registrato almeno una vendita. N vale 2 se
//            anche tu hai venduto, altrimenti 10.
//   ROYAL -> 10 VIP/Royal in tutta la discendenza, non solo tra i diretti.
const ROYAL_RICHIESTI = 10;

export function MyRankCard({
  members,
  sales,
  ranks,
  rootCode,
  isRoot,
}: {
  members: Member[];
  sales: Sale[];
  ranks: Record<number, Rank>;
  rootCode: number;
  isRoot: boolean;
}) {
  const mioRank: Rank = ranks[rootCode] ?? "standard";
  const stile = RANK_STYLE[mioRank];

  const progresso = useMemo(() => {
    const hoVenduto = sales.some((s) => s.seller_code === rootCode);
    const venditoriDiretti = new Set(sales.map((s) => s.seller_code));
    const direttiAttivi = members.filter(
      (m) => m.ref_sponsor_code === rootCode && venditoriDiretti.has(m.activity_code),
    ).length;
    const vipRichiesti = hoVenduto ? 2 : 10;

    // Discendenti VIP/Royal in tutto il sotto-albero strutturale.
    const figliDi = new Map<number, number[]>();
    for (const m of members) {
      if (m.parent_code === null) continue;
      figliDi.set(m.parent_code, [...(figliDi.get(m.parent_code) ?? []), m.activity_code]);
    }
    let vipInRete = 0;
    const daVisitare = [...(figliDi.get(rootCode) ?? [])];
    while (daVisitare.length > 0) {
      const c = daVisitare.pop()!;
      const r = ranks[c];
      if (r === "vip" || r === "royal") vipInRete += 1;
      daVisitare.push(...(figliDi.get(c) ?? []));
    }

    return { hoVenduto, direttiAttivi, vipRichiesti, vipInRete };
  }, [members, sales, ranks, rootCode]);

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
            attuale: progresso.direttiAttivi,
            totale: progresso.vipRichiesti,
            cosa: "diretti che hanno già acquistato",
            nota: progresso.hoVenduto
              ? null
              : "Registrando un tuo acquisto la soglia scende da 10 a 2.",
          }
        : {
            verso: "Royal",
            attuale: progresso.vipInRete,
            totale: ROYAL_RICHIESTI,
            cosa: "VIP o Royal nella tua rete",
            nota: null,
          };

  const percentuale = obiettivo
    ? Math.min(100, Math.round((obiettivo.attuale / obiettivo.totale) * 100))
    : 100;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] p-6 shadow-sm">
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
              <TrendingUp size={14} className="text-gray-400 dark:text-gray-500" />
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
          Hai raggiunto il livello più alto del programma.
          {isRoot && " L'account aziendale è sempre Royal."}
        </p>
      )}
    </div>
  );
}
