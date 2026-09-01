"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { requestWithdrawal, type WithdrawalState } from "./actions";
import { MIN_WITHDRAWAL_AMOUNT, WITHDRAWAL_CHARGE } from "@/lib/withdrawals";

const initialState: WithdrawalState = { error: null, success: false };

const inputClass =
  "h-11 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent";
const labelClass = "text-sm font-medium text-gray-700 dark:text-gray-300";

function formatEuro(value: number) {
  return value.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

export function WithdrawForm({ availableBalance }: { availableBalance: number }) {
  const [state, formAction, pending] = useActionState(requestWithdrawal, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [amount, setAmount] = useState("");
  const [prevSuccess, setPrevSuccess] = useState(state.success);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  if (state.success !== prevSuccess) {
    setPrevSuccess(state.success);
    if (state.success) setAmount("");
  }

  const parsedAmount = Number(amount);
  const netAmount =
    amount !== "" && Number.isFinite(parsedAmount) ? Math.max(parsedAmount - WITHDRAWAL_CHARGE, 0) : null;

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Portafoglio</span>
          <p className="h-11 flex items-center rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 px-3.5 text-sm">
            Portafoglio commissioni
          </p>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Metodo di pagamento</span>
          <p className="h-11 flex items-center rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 px-3.5 text-sm">
            Bonifico bancario
          </p>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Importo *</span>
        <input
          name="amount"
          type="number"
          step="0.01"
          min={MIN_WITHDRAWAL_AMOUNT}
          max={availableBalance}
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inputClass}
          placeholder={`min. ${formatEuro(MIN_WITHDRAWAL_AMOUNT)}`}
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={labelClass}>Nome banca e indirizzo *</span>
          <input name="bank_name" required className={inputClass} placeholder="es. N26" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>IBAN *</span>
          <input name="iban" required className={inputClass} placeholder="IT00X0000000000000000000000" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Tipo di conto</span>
          <select name="account_type" defaultValue="Corrente" className={inputClass}>
            <option value="Corrente">Corrente</option>
            <option value="Risparmio">Risparmio</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={labelClass}>Codice SWIFT/BIC</span>
          <input name="swift_code" className={inputClass} placeholder="opzionale" />
        </label>
      </div>

      <div className="flex flex-col divide-y divide-gray-100 dark:divide-white/5 rounded-lg border border-gray-200 dark:border-white/10 px-4">
        <div className="flex items-center justify-between py-2.5 text-sm">
          <span className="text-gray-500 dark:text-gray-400">Saldo disponibile</span>
          <span className="font-medium text-emerald-600 dark:text-emerald-400">
            {formatEuro(availableBalance)}
          </span>
        </div>
        <div className="flex items-center justify-between py-2.5 text-sm">
          <span className="text-gray-500 dark:text-gray-400">Importo minimo prelevabile</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {formatEuro(MIN_WITHDRAWAL_AMOUNT)}
          </span>
        </div>
        <div className="flex items-center justify-between py-2.5 text-sm">
          <span className="text-gray-500 dark:text-gray-400">Commissioni</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {formatEuro(WITHDRAWAL_CHARGE)}
          </span>
        </div>
        <div className="flex items-center justify-between py-2.5 text-sm">
          <span className="text-gray-600 dark:text-gray-300 font-medium">Netto da ricevere</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {netAmount !== null ? formatEuro(netAmount) : "—"}
          </span>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending || availableBalance < MIN_WITHDRAWAL_AMOUNT}
        className="self-start rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {pending ? "Invio in corso..." : "Richiedi prelievo"}
      </button>

      {availableBalance < MIN_WITHDRAWAL_AMOUNT && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Saldo insufficiente per richiedere un prelievo (minimo {formatEuro(MIN_WITHDRAWAL_AMOUNT)}).
        </p>
      )}

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 rounded-lg px-3 py-2">
          Richiesta di prelievo inviata.
        </p>
      )}
    </form>
  );
}
