"use client";

import { useActionState } from "react";
import { Crown, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { settleRoyalPool, type RoyalPoolState } from "./actions";

export type RoyalPoolInfo = {
  accantonato: number;
  // Quota maturata dove sopra non c'era nessun Royal: resta margine
  // aziendale e non entra nella liquidazione.
  trattenutoAzienda: number;
  vendite: number;
  spettanze: { codice: number; username: string; importo: number }[];
  royalQualificati: number;
  ultimaChiusura: { data: string; totale: number; quantiRoyal: number; quota: number } | null;
};

const initialState: RoyalPoolState = { error: null, esito: null };

function euro(v: number) {
  return v.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

export function RoyalPoolView({ info }: { info: RoyalPoolInfo }) {
  const [state, action, pending] = useActionState(settleRoyalPool, initialState);

  const puoChiudere = info.accantonato > 0 && info.spettanze.length > 0;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] shadow-sm p-6 max-w-xl">
      <div className="flex items-center gap-2">
        <Crown size={18} className="text-amber-500" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Royal Pool</h3>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        A ogni vendita la quota va al primo Royal che si incontra risalendo la struttura: ognuno
        matura sul fatturato del proprio gruppo, non su un fondo comune. Si chiude quando decidi
        tu: non parte da sola.
      </p>

      <div className="grid grid-cols-2 gap-3 mt-5">
        <div className="rounded-lg bg-gray-50 dark:bg-white/5 p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Da distribuire</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums">
            {euro(info.accantonato)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            a {info.spettanze.length} {info.spettanze.length === 1 ? "Royal" : "Royal"}, su{" "}
            {info.vendite} vendite
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 dark:bg-white/5 p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Resta all&apos;azienda</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums">
            {euro(info.trattenutoAzienda)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            vendite senza nessun Royal sopra
          </p>
        </div>
      </div>

      {info.spettanze.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5">
          {info.spettanze.map((s) => (
            <li
              key={s.codice}
              className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 dark:bg-white/5 px-3 py-2 text-sm"
            >
              <span className="text-gray-600 dark:text-gray-300 truncate">{s.username}</span>
              <span className="font-medium text-gray-900 dark:text-white tabular-nums shrink-0">
                {euro(s.importo)}
              </span>
            </li>
          ))}
        </ul>
      )}

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
              ? "Non c'è ancora nulla da distribuire ai Royal."
              : "Nessun Royal ha maturato una quota: le somme restano accantonate."}
          </p>
        )}

        {/* L'arrotondamento per difetto lascia qualche centesimo nel pool:
            meglio dirlo che far tornare i conti a metà. */}
        {puoChiudere && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            L&apos;operazione accredita a ciascuno la propria quota e non si può annullare.
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
