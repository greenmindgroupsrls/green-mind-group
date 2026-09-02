"use client";

import { useActionState } from "react";
import { Crown, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { settleRoyalPool, type RoyalPoolState } from "./actions";

export type RoyalPoolInfo = {
  accantonato: number;
  vendite: number;
  royalQualificati: number;
  ultimaChiusura: { data: string; totale: number; quantiRoyal: number; quota: number } | null;
};

const initialState: RoyalPoolState = { error: null, esito: null };

function euro(v: number) {
  return v.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

export function RoyalPoolView({ info }: { info: RoyalPoolInfo }) {
  const [state, action, pending] = useActionState(settleRoyalPool, initialState);

  const quotaPrevista =
    info.royalQualificati > 0
      ? Math.floor((info.accantonato / info.royalQualificati) * 100) / 100
      : 0;

  const puoChiudere = info.accantonato > 0 && info.royalQualificati > 0;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] shadow-sm p-6 max-w-xl">
      <div className="flex items-center gap-2">
        <Crown size={18} className="text-amber-500" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Royal Pool</h3>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Quota accantonata a ogni pezzo venduto, divisa in parti uguali fra chi ha la qualifica
        Royal. Si chiude quando decidi tu: non parte da sola.
      </p>

      <div className="grid grid-cols-2 gap-3 mt-5">
        <div className="rounded-lg bg-gray-50 dark:bg-white/5 p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Accantonato</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums">
            {euro(info.accantonato)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">su {info.vendite} vendite</p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-white/5 p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Royal qualificati</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums">
            {info.royalQualificati}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {puoChiudere ? `${euro(quotaPrevista)} a testa` : "nessun beneficiario"}
          </p>
        </div>
      </div>

      {info.ultimaChiusura && (
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Ultima chiusura il {info.ultimaChiusura.data}: {euro(info.ultimaChiusura.totale)} divisi
          fra {info.ultimaChiusura.quantiRoyal} Royal, {euro(info.ultimaChiusura.quota)} a testa.
        </p>
      )}

      <form action={action} className="mt-5">
        <button
          type="submit"
          disabled={pending || !puoChiudere}
          className="h-10 px-4 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
        >
          {pending && <Loader2 size={15} className="animate-spin" />}
          {pending ? "Chiusura in corso..." : "Chiudi il pool e distribuisci"}
        </button>

        {!puoChiudere && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {info.accantonato <= 0
              ? "Non c'è ancora nulla da distribuire."
              : "Nessuno ha ancora la qualifica Royal: le somme restano accantonate."}
          </p>
        )}

        {/* L'arrotondamento per difetto lascia qualche centesimo nel pool:
            meglio dirlo che far tornare i conti a metà. */}
        {puoChiudere && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            L&apos;operazione accredita le quote e non si può annullare. Gli eventuali centesimi
            di resto restano nel pool per la chiusura successiva.
          </p>
        )}
      </form>

      {state.error && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          {state.error}
        </p>
      )}
      {state.esito && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
          Distribuiti {euro(state.esito.totale)} fra {state.esito.quantiRoyal} Royal:{" "}
          {euro(state.esito.quota)} a testa.
        </p>
      )}
    </div>
  );
}
