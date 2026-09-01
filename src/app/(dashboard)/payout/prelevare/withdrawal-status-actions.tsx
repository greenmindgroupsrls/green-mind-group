"use client";

import { setWithdrawalStatus } from "./actions";

export function WithdrawalStatusActions({ id }: { id: number }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => setWithdrawalStatus(id, "paid")}
        className="text-emerald-600 dark:text-emerald-400 text-xs font-medium hover:underline"
      >
        Segna come pagato
      </button>
      <button
        type="button"
        onClick={() => setWithdrawalStatus(id, "rejected")}
        className="text-red-600 dark:text-red-400 text-xs font-medium hover:underline"
      >
        Rifiuta
      </button>
    </div>
  );
}
