export type WithdrawalStatus = "pending" | "paid" | "rejected";

export type WithdrawalRequest = {
  id: number;
  activity_code: number;
  amount: number;
  charges: number;
  tax: number;
  net_amount: number;
  bank_name: string;
  iban: string;
  account_type: string | null;
  swift_code: string | null;
  status: WithdrawalStatus;
  created_at: string;
  processed_at: string | null;
  processed_by: number | null;
};

export const WITHDRAWAL_STATUS_LABEL: Record<WithdrawalStatus, string> = {
  pending: "In attesa",
  paid: "Pagato",
  rejected: "Rifiutato",
};

export const WITHDRAWAL_STATUS_BADGE_CLASS: Record<WithdrawalStatus, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
};

export const MIN_WITHDRAWAL_AMOUNT = 10;
export const WITHDRAWAL_CHARGE = 3;
