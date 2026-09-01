"use client";

import { useActionState } from "react";
import { updateCompensationSettings, type CompensationSettingsState } from "./actions";

const labelClass = "text-xs font-medium text-gray-500 dark:text-gray-400";
const inputClass =
  "h-10 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent";

export type CompensationSettings = {
  level0Rate: number;
  level1Rate: number;
  level2Rate: number;
  level3Rate: number;
};

const initialState: CompensationSettingsState = { error: null, success: false };

export function CompensationSettingsView({ settings }: { settings: CompensationSettings }) {
  const [state, action, pending] = useActionState(updateCompensationSettings, initialState);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] shadow-sm p-6 max-w-xl">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Tariffe per pezzo venduto</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Importo generato per ogni pezzo venduto, per livello. Il venditore (livello 0) riceve sempre la sua
        tariffa; i livelli 1 e 2 solo se il beneficiario è VIP o Royal; il livello 3 solo se è Royal.
      </p>

      <form action={action} className="flex flex-col gap-4 mt-5">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Livello 0 — venditore (€)</span>
            <input
              name="level0_rate"
              type="number"
              step="0.01"
              min="0"
              defaultValue={settings.level0Rate}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Livello 1 (€, se VIP/Royal)</span>
            <input
              name="level1_rate"
              type="number"
              step="0.01"
              min="0"
              defaultValue={settings.level1Rate}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Livello 2 (€, se VIP/Royal)</span>
            <input
              name="level2_rate"
              type="number"
              step="0.01"
              min="0"
              defaultValue={settings.level2Rate}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Livello 3 (€, solo se Royal)</span>
            <input
              name="level3_rate"
              type="number"
              step="0.01"
              min="0"
              defaultValue={settings.level3Rate}
              className={inputClass}
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50 w-fit"
          >
            {pending ? "Salvataggio..." : "Salva parametri"}
          </button>
          {state.success && <span className="text-xs text-emerald-600 dark:text-emerald-400">Salvato</span>}
          {state.error && <span className="text-xs text-red-600 dark:text-red-400">{state.error}</span>}
        </div>
      </form>
    </div>
  );
}
