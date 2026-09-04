"use client";

import { useActionState, useState } from "react";
import {
  updatePlan2Settings,
  updateProductPrices,
  type CompensationSettingsState,
  type ListinoState,
} from "./actions";

const labelClass = "text-xs font-medium text-gray-500 dark:text-gray-400";
const inputClass =
  "h-10 glass-input px-3 text-sm";

export type CompensationSettings = {
  attivoDa: string | null;
  direttaPct: number;
  passUpPct: number;
  royalPct: number;
  uplinePct: number;
  ivaPct: number;
  passUpQuota: number;
  royalDiretti: number;
  // Serve solo a mostrare quanto fa ogni percentuale in euro: senza, chi
  // scrive "16" non ha modo di sapere se sono 169 o 182.
  prodotti: { id: number; nome: string; prezzo: number }[];
};

const initialState: CompensationSettingsState = { error: null, success: false };
const listinoIniziale: ListinoState = { error: null, success: false };

function euro(v: number) {
  return v.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function Percentuale({
  etichetta,
  name,
  valore,
  onChange,
  spiegazione,
}: {
  etichetta: string;
  name: string;
  valore: number;
  onChange: (v: number) => void;
  spiegazione: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className={labelClass}>{etichetta}</span>
      <div className="flex items-center gap-2">
        <input
          name={name}
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={valore}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`${inputClass} w-24`}
        />
        <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400">{spiegazione}</span>
    </label>
  );
}

export function CompensationSettingsView({ settings }: { settings: CompensationSettings }) {
  const [state, action, pending] = useActionState(updatePlan2Settings, initialState);

  const [diretta, setDiretta] = useState(settings.direttaPct);
  const [passUp, setPassUp] = useState(settings.passUpPct);
  const [royal, setRoyal] = useState(settings.royalPct);
  const [upline, setUpline] = useState(settings.uplinePct);
  const [iva, setIva] = useState(settings.ivaPct);
  const [prezzi, setPrezzi] = useState<Record<number, number>>(
    Object.fromEntries(settings.prodotti.map((p) => [p.id, p.prezzo])),
  );
  const [statoListino, azioneListino, salvandoListino] = useActionState(
    updateProductPrices,
    listinoIniziale,
  );

  const somma = diretta + passUp + royal + upline;
  const troppo = somma > 100;

  // Le percentuali si calcolano sull'imponibile, non sul prezzo di listino:
  // qui si mostra il risultato in euro per ogni modello, cosi' chi scrive un
  // numero vede subito quanto significa davvero.
  const anteprima = settings.prodotti.map((p) => {
    const imponibile = (prezzi[p.id] ?? p.prezzo) / (1 + iva / 100);
    return {
      id: p.id,
      nome: p.nome,
      imponibile,
      diretta: (imponibile * diretta) / 100,
      passUp: (imponibile * passUp) / 100,
      royal: (imponibile * royal) / 100,
      upline: (imponibile * upline) / 100,
    };
  });

  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Piano compensi</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Ogni voce è una percentuale sull&apos;imponibile del prodotto venduto. Chi vende riceve la
        diretta; le prime vendite di ciascuno vengono cedute al primo VIP che si trova risalendo,
        che incassa il pass-up; chi cede le linee riceve l&apos;indennizzo finché non diventa
        Royal; il primo Royal risalendo riceve la sua quota.
      </p>
      {settings.attivoDa && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          In vigore dal {settings.attivoDa}.
        </p>
      )}

      <form action={action} className="flex flex-col gap-5 mt-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Percentuale
            etichetta="Provvigione diretta"
            name="plan2_direct_pct"
            valore={diretta}
            onChange={setDiretta}
            spiegazione="a chi effettua la vendita"
          />
          <Percentuale
            etichetta="Pass-up VIP"
            name="plan2_passup_pct"
            valore={passUp}
            onChange={setPassUp}
            spiegazione="al primo VIP risalendo, sulle vendite di qualifica"
          />
          <Percentuale
            etichetta="Quota Royal"
            name="plan2_royal_pct"
            valore={royal}
            onChange={setRoyal}
            spiegazione="al primo Royal risalendo, sul fatturato del suo gruppo"
          />
          <Percentuale
            etichetta="Indennizzo linea ceduta"
            name="plan2_upline_pct"
            valore={upline}
            onChange={setUpline}
            spiegazione="a chi ha ceduto la linea, finché non diventa Royal"
          />
        </div>

        <p
          className={`text-xs rounded-lg px-3 py-2 ${
            troppo
              ? "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400"
              : "bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300"
          }`}
        >
          In tutto si distribuisce il <strong>{somma.toFixed(2)}%</strong> dell&apos;imponibile.
          {troppo && " Oltre il 100% si pagherebbe più di quanto si incassa: il salvataggio verrà rifiutato."}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Aliquota IVA</span>
            <div className="flex items-center gap-2">
              <input
                name="vat_rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={iva}
                onChange={(e) => setIva(Number(e.target.value))}
                className={`${inputClass} w-24`}
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              serve a ricavare l&apos;imponibile dal prezzo
            </span>
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Vendite da cedere per il VIP</span>
            <input
              name="plan2_passup_quota"
              type="number"
              step="1"
              min="0"
              defaultValue={settings.passUpQuota}
              className={`${inputClass} w-24`}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>VIP iscritti per il Royal</span>
            <input
              name="plan2_royal_directs"
              type="number"
              step="1"
              min="1"
              defaultValue={settings.royalDiretti}
              className={`${inputClass} w-24`}
            />
          </label>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Le modifiche valgono sulle vendite future. Quelle già registrate restano come sono state
          pagate.
        </p>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending || troppo}
            className="glass-btn-primary rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 w-fit"
          >
            {pending ? "Salvataggio..." : "Salva parametri"}
          </button>
          {state.success && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">Salvato</span>
          )}
          {state.error && <span className="text-xs text-red-600 dark:text-red-400">{state.error}</span>}
        </div>
      </form>

      {/* Il listino e' un modulo a parte: un modulo dentro l'altro non e'
          HTML valido. I campi dei prezzi stanno dentro la tabella e la
          raggiungono con l'attributo form, cosi' si vede il prezzo accanto
          a quello che genera. */}
      <form action={azioneListino} id="listino" className="flex flex-col gap-3 mt-6">
        {anteprima.length > 0 && (
          <div className="rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 dark:bg-white/5 text-xs font-medium text-gray-600 dark:text-gray-300">
              Listino e provvigioni per modello — cambia un prezzo e vedi subito il risultato
            </div>
            <div className="overflow-x-auto">
              <table className="glass-table w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-2 font-medium">Prodotto</th>
                    <th className="px-4 py-2 font-medium text-right">Prezzo</th>
                    <th className="px-4 py-2 font-medium text-right">Imponibile</th>
                    <th className="px-4 py-2 font-medium text-right">Diretta</th>
                    <th className="px-4 py-2 font-medium text-right">Pass-up</th>
                    <th className="px-4 py-2 font-medium text-right">Royal</th>
                    <th className="px-4 py-2 font-medium text-right">Indennizzo</th>
                  </tr>
                </thead>
                <tbody>
                  {anteprima.map((r) => (
                    <tr key={r.nome} className="border-t border-[var(--glass-edge)]">
                      <td className="px-4 py-2 text-gray-900 dark:text-white">{r.nome}</td>
                      <td className="px-4 py-2 text-right">
                        <input
                          form="listino"
                          name={`prezzo_${r.id}`}
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={prezzi[r.id] ?? ""}
                          onChange={(e) =>
                            setPrezzi((v) => ({ ...v, [r.id]: Number(e.target.value) }))
                          }
                          className={`${inputClass} w-28 text-right`}
                        />
                      </td>
                      <td className="px-4 py-2 text-right text-gray-500 dark:text-gray-400 tabular-nums">
                        {euro(r.imponibile)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{euro(r.diretta)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{euro(r.passUp)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{euro(r.royal)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{euro(r.upline)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={salvandoListino}
            className="glass-btn-soft rounded-lg px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 w-fit disabled:opacity-50"
          >
            {salvandoListino ? "Salvataggio..." : "Salva listino"}
          </button>
          {statoListino.success && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">Listino salvato</span>
          )}
          {statoListino.error && (
            <span className="text-xs text-red-600 dark:text-red-400">{statoListino.error}</span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Le provvigioni sono percentuali sull&apos;imponibile: cambiando un prezzo si adeguano da
          sole. Quelle già maturate restano come sono state calcolate.
        </p>
      </form>
    </div>
  );
}
