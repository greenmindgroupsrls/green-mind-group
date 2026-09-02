import type { Member } from "./members";
import type { CommissionEntry, Sale } from "./commissions";
import { computeCommissionsForSale } from "./commissions";
import type { Rank } from "./rank";

const MONTH_LABELS = [
  "Gen",
  "Feb",
  "Mar",
  "Apr",
  "Mag",
  "Giu",
  "Lug",
  "Ago",
  "Set",
  "Ott",
  "Nov",
  "Dic",
];

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-");
  return `${MONTH_LABELS[Number(month) - 1]} ${year}`;
}

export function allCommissionEntries(members: Member[], sales: Sale[]): CommissionEntry[] {
  let nextId = 1;
  const entries: CommissionEntry[] = [];
  for (const sale of sales) {
    for (const entry of computeCommissionsForSale(members, sale)) {
      entries.push({ ...entry, id: nextId++ });
    }
  }
  return entries;
}

function seriesForLastMonths(
  countByMonth: Map<string, number>,
  monthsBack: number,
  now: Date,
): { label: string; value: number }[] {
  const points: { label: string; value: number }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    points.push({ label: monthLabel(key), value: countByMonth.get(key) ?? 0 });
  }
  return points;
}

function memberDisplayName(m: Member): string {
  if (m.first_name && m.last_name) return `${m.first_name} ${m.last_name}`;
  return m.username;
}

export type NetworkActivityRow = {
  key: string;
  sponsorCode: number | null;
  sponsorName: string;
  eventLabel: string;
  memberCode: number;
  memberName: string;
  created_at: string;
  amount: number | null;
};

// Elenco "chi ha introdotto chi" in tutta la rete visibile (già scoped al
// sotto-albero da RLS a monte). L'importo è la commissione di livello 0
// realmente generata per lo sponsor sulla vendita simbolica abbinata
// all'iscrizione (flusso "Iscrivi e registra vendita" del back office) —
// non un prezzo di vendita, che nel modello dati attuale non esiste
// collegato a un'iscrizione (vedi commento in register_sale). Trovata per
// corrispondenza: stesso sponsor come seller_code + vendita registrata
// entro pochi secondi dalla creazione del nuovo membro (le due scritture
// avvengono in sequenza nella stessa richiesta server, quindi sono
// praticamente simultanee). Le iscrizioni via auto-registrazione (nessuna
// vendita abbinata) restano semplicemente senza importo.
export function buildNetworkActivity(
  members: Member[],
  sales: Sale[],
  entries: CommissionEntry[],
  limit = 15,
): NetworkActivityRow[] {
  const byCode = new Map(members.map((m) => [m.activity_code, m]));
  const salesBySeller = new Map<number, Sale[]>();
  for (const s of sales) {
    const list = salesBySeller.get(s.seller_code) ?? [];
    list.push(s);
    salesBySeller.set(s.seller_code, list);
  }
  const level0AmountBySale = new Map<number, number>();
  for (const e of entries) {
    // Le quote del Royal Pool non hanno vendita: non entrano in questa mappa.
    if (e.level === 0 && e.sale_id !== null) level0AmountBySale.set(e.sale_id, e.amount);
  }

  const MATCH_WINDOW_MS = 60_000;

  const rows = members
    .filter((m) => m.ref_sponsor_code !== null)
    .map((m) => {
      const sponsor = byCode.get(m.ref_sponsor_code!);
      const candidates = sponsor ? (salesBySeller.get(sponsor.activity_code) ?? []) : [];
      const memberTime = new Date(m.created_at).getTime();
      let bestSale: Sale | null = null;
      let bestDiff = Infinity;
      for (const s of candidates) {
        const diff = Math.abs(new Date(s.created_at).getTime() - memberTime);
        if (diff <= MATCH_WINDOW_MS && diff < bestDiff) {
          bestSale = s;
          bestDiff = diff;
        }
      }

      return {
        key: `${m.activity_code}`,
        sponsorCode: sponsor?.activity_code ?? null,
        sponsorName: sponsor ? memberDisplayName(sponsor) : "—",
        eventLabel: m.role === "cliente" ? "Nuovo cliente" : "Nuovo incaricato",
        memberCode: m.activity_code,
        memberName: memberDisplayName(m),
        created_at: m.created_at,
        amount: bestSale ? (level0AmountBySale.get(bestSale.id) ?? null) : null,
      };
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return rows.slice(0, limit);
}

export function buildDashboardData(
  members: Member[],
  sales: Sale[],
  entries: CommissionEntry[],
  ranksByCode: Record<number, Rank>,
  rootCode: number = 0,
  now: Date = new Date(),
) {
  const ranks = new Map(Object.entries(ranksByCode).map(([code, rank]) => [Number(code), rank]));
  const networkMembers = members.filter((m) => m.activity_code !== rootCode);

  const totalIncome = entries.reduce((sum, e) => sum + e.amount, 0);
  const totalPiecesSold = sales.reduce((sum, s) => sum + s.quantity, 0);

  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  const incomeByMonth = new Map<string, number>();
  for (const e of entries) {
    const key = monthKey(e.created_at);
    incomeByMonth.set(key, (incomeByMonth.get(key) ?? 0) + e.amount);
  }
  const incomeThisMonth = incomeByMonth.get(currentMonthKey) ?? 0;
  const incomePrevMonth = incomeByMonth.get(prevMonthKey) ?? 0;
  const incomeDeltaPct =
    incomePrevMonth > 0 ? Math.round(((incomeThisMonth - incomePrevMonth) / incomePrevMonth) * 100) : null;

  const signupsByMonth = new Map<string, number>();
  for (const m of networkMembers) {
    const key = monthKey(m.created_at);
    signupsByMonth.set(key, (signupsByMonth.get(key) ?? 0) + 1);
  }
  const signupsThisMonth = signupsByMonth.get(currentMonthKey) ?? 0;
  const signupsPrevMonth = signupsByMonth.get(prevMonthKey) ?? 0;

  const rankCounts: Record<Rank, number> = { standard: 0, vip: 0, royal: 0 };
  for (const m of networkMembers) {
    const r = ranks.get(m.activity_code) ?? "standard";
    rankCounts[r]++;
  }

  const byCode = new Map(members.map((m) => [m.activity_code, m]));

  const recentReferrals = [...networkMembers]
    .sort((a, b) => b.activity_code - a.activity_code)
    .slice(0, 6)
    .map((m) => ({
      code: m.activity_code,
      username: m.username,
      ref: m.ref_sponsor_code !== null ? byCode.get(m.ref_sponsor_code)?.username ?? "—" : "—",
      rank: ranks.get(m.activity_code) ?? "standard",
      created_at: m.created_at,
    }));

  const structuralDirectsOfRoot = members.filter((m) => m.parent_code === rootCode);
  const subtreeSize = (rootCode: number): number => {
    let count = 0;
    const stack = members.filter((m) => m.parent_code === rootCode);
    while (stack.length > 0) {
      const node = stack.pop()!;
      count++;
      stack.push(...members.filter((m) => m.parent_code === node.activity_code));
    }
    return count;
  };
  const earningsByMember = new Map<number, number>();
  for (const e of entries) {
    earningsByMember.set(e.beneficiary_code, (earningsByMember.get(e.beneficiary_code) ?? 0) + e.amount);
  }
  const teamPerformance = structuralDirectsOfRoot
    .map((m) => ({
      code: m.activity_code,
      username: m.username,
      rank: ranks.get(m.activity_code) ?? "standard",
      teamSize: subtreeSize(m.activity_code),
      earnings: earningsByMember.get(m.activity_code) ?? 0,
    }))
    .sort((a, b) => b.earnings - a.earnings)
    .slice(0, 6);

  return {
    totalIncome,
    totalPiecesSold,
    totalMembers: networkMembers.length,
    signupsThisMonth,
    signupsDelta: signupsThisMonth - signupsPrevMonth,
    incomeDeltaPct,
    rankCounts,
    signupSeries: seriesForLastMonths(signupsByMonth, 7, now),
    recentReferrals,
    networkActivity: buildNetworkActivity(members, sales, entries),
    teamPerformance,
  };
}
