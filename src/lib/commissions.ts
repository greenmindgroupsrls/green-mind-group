import type { Member } from "./members";

export type Sale = {
  id: number;
  seller_code: number;
  quantity: number;
  created_at: string;
};

// Sistema 2: 'diretta' e' la provvigione di chi vende, 'pass_up' quella che
// sale al primo VIP, 'pool_royal' la quota del Royal Pool. Le righe del piano
// precedente non hanno tipo e si leggono dal livello.
export type CommissionKind = "diretta" | "pass_up" | "upline" | "pool_royal";

export type CommissionEntry = {
  id: number;
  // Nullo sulle quote del Royal Pool: non nascono da una singola vendita.
  sale_id: number | null;
  beneficiary_code: number;
  level: 0 | 1 | 2 | 3 | 4 | 5;
  amount: number;
  created_at: string;
  kind?: CommissionKind | null;
};

// Mirror di register_sale() per la sola modalita' dimostrativa, quella che
// si vede quando Supabase non e' collegato (vedi load-network-data.ts).
// Riproduce il Sistema 2: provvigione diretta per pezzo a chi vende. Il
// pass-up non compare perche' richiede un acquirente iscritto, che le
// vendite finte non hanno.
const DIMOSTRATIVO_DIRETTA = 170;

export function computeCommissionsForSale(
  members: Member[],
  sale: Sale,
): Omit<CommissionEntry, "id">[] {
  const seller = members.find((m) => m.activity_code === sale.seller_code);
  if (!seller || seller.role === "cliente") return [];

  return [
    {
      sale_id: sale.id,
      beneficiary_code: sale.seller_code,
      level: 0,
      amount: sale.quantity * DIMOSTRATIVO_DIRETTA,
      created_at: sale.created_at,
      kind: "diretta",
    },
  ];
}
