import type { Member } from "./members";
import type { CommissionEntry, Sale } from "./commissions";
import type { WithdrawalRequest } from "./withdrawals";

export type WalletOverview = {
  totalEarnings: number;
  byLevel: Record<0 | 1 | 2 | 3, number>;
};

// Riepilogo del portafoglio di un membro: tutto ciò che ha guadagnato,
// suddiviso per livello (0 = vendita diretta propria, 1-3 = commissioni
// ricevute dal proprio team — le "3 forme di pagamento" del sistema).
export function buildWalletOverview(entries: CommissionEntry[], code: number): WalletOverview {
  const byLevel: Record<0 | 1 | 2 | 3, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  let totalEarnings = 0;

  for (const entry of entries) {
    if (entry.beneficiary_code !== code) continue;
    byLevel[entry.level] += entry.amount;
    totalEarnings += entry.amount;
  }

  return { totalEarnings, byLevel };
}

// Saldo disponibile per il prelievo: quanto guadagnato meno quanto già
// richiesto a prelievo (pending o pagato — un rifiuto libera di nuovo il
// saldo). Mirror di create_withdrawal_request() lato SQL, usato qui solo
// per mostrare il saldo nella UI: la validazione vera resta nel DB.
export function computeAvailableBalance(
  entries: CommissionEntry[],
  withdrawals: WithdrawalRequest[],
  code: number,
): number {
  const earned = entries
    .filter((e) => e.beneficiary_code === code)
    .reduce((sum, e) => sum + e.amount, 0);

  const withdrawn = withdrawals
    .filter((w) => w.activity_code === code && w.status !== "rejected")
    .reduce((sum, w) => sum + w.net_amount, 0);

  return earned - withdrawn;
}

export type CommissionRow = {
  id: number;
  level: 1 | 2 | 3;
  amount: number;
  createdAt: string;
  sellerCode: number;
  sellerUsername: string;
};

// Righe della tabella "Commissioni": solo i livelli 1-3 (commissioni
// ricevute dal team), non la vendita diretta propria — quella è nella
// Panoramica ("Vendita diretta"), qui ci sono solo le 3 forme di
// commissione vere e proprie.
export function buildCommissionRows(
  entries: CommissionEntry[],
  sales: Sale[],
  members: Member[],
  code: number,
): CommissionRow[] {
  const saleById = new Map(sales.map((s) => [s.id, s]));
  const memberByCode = new Map(members.map((m) => [m.activity_code, m]));

  return entries
    .filter((e) => e.beneficiary_code === code && e.level !== 0)
    .map((e) => {
      const sale = saleById.get(e.sale_id);
      const seller = sale ? memberByCode.get(sale.seller_code) : undefined;
      return {
        id: e.id,
        level: e.level as 1 | 2 | 3,
        amount: e.amount,
        createdAt: e.created_at,
        sellerCode: seller?.activity_code ?? sale?.seller_code ?? 0,
        sellerUsername: seller?.username ?? "—",
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
