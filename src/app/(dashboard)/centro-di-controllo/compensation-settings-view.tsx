"use client";

import { useActionState } from "react";
import { updatePlan2Settings, type CompensationSettingsState } from "./actions";

const labelClass = "text-xs font-medium text-gray-500 dark:text-gray-400";
const inputClass =
  "h-10 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent";

export type CompensationSettings = {
  // Data di partenza del piano, solo da mostrare: non c'e' piu' un altro
  // piano fra cui scegliere.
  attivoDa: string | null;
  direttaRate: number;
  passUpRate: number;
  poolRate: number;
  passUpQuota: number;
  royalDiretti: number;
};

const initialState: CompensationSettingsState = { error: null, success: false };

function Campo({
  etichetta,
  name,
  valore,
  step = "0.01",
  min = "0",
}: {
  etichetta: string;
  name: string;
  valore: number;
  step?: string;
  min?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className={labelClass}>{etichetta}</span>
      <input name={name} type="number" step={step} min={min} defaultValue={valore} className={inputClass} />
    </label>
  );
}

export function CompensationSettingsView({ settings }: { settings: CompensationSettings }) {
  const [state, action, pending] = useActionState(updatePlan2Settings, initialState);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] shadow-sm p-6 max-w-xl">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Piano compensi</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Chi vende riceve la provvigione diretta su ogni pezzo. Le prime vendite di ciascuno vengono
        cedute al primo VIP che si trova risalendo la struttura, che incassa il pass-up; dopo averle
        cedute si diventa VIP e i propri iscritti restano propri. A ogni pezzo una quota va nel
        Royal Pool.
      </p>
      {settings.attivoDa && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          In vigore dal {settings.attivoDa}.
        </p>
      )}

      <form action={action} className="flex flex-col gap-4 mt-5">
        <div className="flex flex-col gap-3">
          <Campo
            etichetta="Provvigione diretta, per pezzo (€)"
            name="plan2_direct_rate"
            valore={settings.direttaRate}
          />
          <Campo
            etichetta="Pass-up al VIP superiore (€)"
            name="plan2_passup_rate"
            valore={settings.passUpRate}
          />
          <Campo
            etichetta="Quota Royal Pool, per pezzo (€)"
            name="plan2_pool_rate"
            valore={settings.poolRate}
          />
          <Campo
            etichetta="Vendite da cedere prima di diventare VIP"
            name="plan2_passup_quota"
            valore={settings.passUpQuota}
            step="1"
          />
          <Campo
            etichetta="VIP diretti richiesti per la qualifica Royal"
            name="plan2_royal_directs"
            valore={settings.royalDiretti}
            step="1"
            min="1"
          />
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Le modifiche valgono sulle vendite future. Quelle già registrate restano come sono state
          pagate.
        </p>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50 w-fit"
          >
            {pending ? "Salvataggio..." : "Salva parametri"}
          </button>
          {state.success && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">Salvato</span>
          )}
          {state.error && <span className="text-xs text-red-600 dark:text-red-400">{state.error}</span>}
        </div>
      </form>
    </div>
  );
}
