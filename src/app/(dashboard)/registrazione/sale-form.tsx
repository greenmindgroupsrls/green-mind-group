"use client";

import { useActionState } from "react";
import { registerSale, type RegisterSaleState } from "./sale-actions";

const initialState: RegisterSaleState = { error: null, success: null };

const LEVEL_LABEL: Record<number, string> = {
  0: "Venditore",
  1: "Livello 1",
  2: "Livello 2",
  3: "Livello 3",
};

export function SaleForm({
  isRoot,
  ownCode,
  ownUsername,
}: {
  isRoot: boolean;
  ownCode: number | null;
  ownUsername: string | null;
}) {
  const [state, formAction, pending] = useActionState(registerSale, initialState);

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-5">
        {isRoot ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Codice venditore
            </span>
            <input
              name="seller_code"
              required
              type="number"
              min={0}
              className="rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
              placeholder="es. 31"
            />
          </label>
        ) : (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Venditore</span>
            <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-white/5 rounded-lg px-3.5 py-2.5">
              Tu — #{ownCode} {ownUsername}
            </p>
          </div>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Quantità pezzi venduti
          </span>
          <input
            name="quantity"
            required
            type="number"
            min={1}
            className="rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            placeholder="es. 3"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {pending ? "Registrazione in corso..." : "Registra vendita"}
        </button>

        {state.error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
            {state.error}
          </p>
        )}
      </form>

      {state.success && (
        <div className="rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 dark:bg-white/5 text-sm font-medium text-gray-700 dark:text-gray-300">
            Commissioni generate — vendita #{state.success.sale_id}
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-white/10">
                <th className="px-4 py-2 font-medium">Livello</th>
                <th className="px-4 py-2 font-medium">Beneficiario</th>
                <th className="px-4 py-2 font-medium text-right">Importo</th>
              </tr>
            </thead>
            <tbody>
              {state.success.entries.map((entry) => (
                <tr
                  key={`${entry.beneficiary_code}-${entry.level}`}
                  className="border-b border-gray-100 dark:border-white/5 last:border-0"
                >
                  <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">
                    {LEVEL_LABEL[entry.level] ?? entry.level}
                  </td>
                  <td className="px-4 py-2.5 text-gray-900 dark:text-white">
                    #{entry.beneficiary_code} {entry.beneficiary_username}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900 dark:text-white">
                    {entry.amount.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
