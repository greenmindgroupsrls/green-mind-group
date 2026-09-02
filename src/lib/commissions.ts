import type { Member } from "./members";
import { computeRanks } from "./rank";

export type Sale = {
  id: number;
  seller_code: number;
  quantity: number;
  created_at: string;
};

// Sistema 2: 'diretta' e' la provvigione di chi vende, 'pass_up' quella che
// sale al primo VIP, 'pool_royal' la quota del Royal Pool. Le righe del piano
// precedente non hanno tipo e si leggono dal livello.
export type CommissionKind = "diretta" | "pass_up" | "pool_royal";

export type CommissionEntry = {
  id: number;
  // Nullo sulle quote del Royal Pool: non nascono da una singola vendita.
  sale_id: number | null;
  beneficiary_code: number;
  level: 0 | 1 | 2 | 3 | 4;
  amount: number;
  created_at: string;
  kind?: CommissionKind | null;
};

// Mirror di register_sale() (vedi supabase/migrations/0002_ranks_and_commissions.sql).
export function computeCommissionsForSale(
  members: Member[],
  sale: Sale,
): Omit<CommissionEntry, "id">[] {
  const byCode = new Map(members.map((m) => [m.activity_code, m]));
  const ranks = computeRanks(members);
  const seller = byCode.get(sale.seller_code);
  if (!seller) return [];

  const entries: Omit<CommissionEntry, "id">[] = [
    {
      sale_id: sale.id,
      beneficiary_code: sale.seller_code,
      level: 0,
      amount: sale.quantity * 100,
      created_at: sale.created_at,
    },
  ];

  const level1Code = seller.parent_code;
  if (level1Code === null) return entries;
  const level1Rank = ranks.get(level1Code);
  if (level1Rank === "vip" || level1Rank === "royal") {
    entries.push({
      sale_id: sale.id,
      beneficiary_code: level1Code,
      level: 1,
      amount: sale.quantity * 100,
      created_at: sale.created_at,
    });
  }

  const level2Code = byCode.get(level1Code)?.parent_code ?? null;
  if (level2Code === null) return entries;
  const level2Rank = ranks.get(level2Code);
  if (level2Rank === "vip" || level2Rank === "royal") {
    entries.push({
      sale_id: sale.id,
      beneficiary_code: level2Code,
      level: 2,
      amount: sale.quantity * 50,
      created_at: sale.created_at,
    });
  }

  const level3Code = byCode.get(level2Code)?.parent_code ?? null;
  if (level3Code === null) return entries;
  const level3Rank = ranks.get(level3Code);
  if (level3Rank === "royal") {
    entries.push({
      sale_id: sale.id,
      beneficiary_code: level3Code,
      level: 3,
      amount: sale.quantity * 20,
      created_at: sale.created_at,
    });
  }

  return entries;
}
