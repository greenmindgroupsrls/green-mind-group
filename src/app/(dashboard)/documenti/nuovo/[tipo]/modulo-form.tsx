"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { creaDocumento, type StatoModulo } from "../../actions";
import { CAMPI_DOCUMENTO, campoVisibile, type Campo } from "@/lib/documento-campi";
import {
  COSTO_CONSEGNA,
  COSTO_INSTALLAZIONE,
  PREZZI_PRODOTTO,
  euro,
  type TipoDocumento,
} from "@/lib/documenti";

// IL MODULO
//
// Un solo modulo per tutti e quattro i documenti: i campi li descrive
// documento-campi.ts, qui si disegnano. Cosi' aggiungere una domanda a un
// contratto non vuol dire scrivere un'altra pagina.
//
// Lo stato dei valori serve a due cose: nascondere i campi che non
// c'entrano (la partita IVA se il cliente non e' un professionista) e
// mostrare il totale mentre si spuntano consegna e installazione.

const inputClass = "h-11 w-full glass-input px-3.5 text-sm";
const labelClass = "text-sm font-medium text-gray-700 dark:text-gray-300";

const statoIniziale: StatoModulo = { error: null };

export function ModuloForm({
  tipo,
  valoriIniziali,
}: {
  tipo: TipoDocumento;
  valoriIniziali: Record<string, string>;
}) {
  const [stato, azione, inCorso] = useActionState(creaDocumento, statoIniziale);
  const [valori, setValori] = useState<Record<string, string>>(valoriIniziali);

  const aggiorna = (nome: string, valore: string) =>
    setValori((prima) => ({ ...prima, [nome]: valore }));

  const prodotto = PREZZI_PRODOTTO[valori.prodotto ?? ""] ?? null;
  const totale =
    (prodotto?.prezzo ?? 0) +
    (valori.consegna === "on" ? COSTO_CONSEGNA : 0) +
    (valori.installazione === "on" ? COSTO_INSTALLAZIONE : 0);

  const campo = (c: Campo) => {
    const valore = valori[c.nome] ?? "";

    if (c.tipo === "checkbox") {
      return (
        <label key={c.nome} className="flex items-start gap-2.5 py-1">
          <input
            type="checkbox"
            name={c.nome}
            checked={valore === "on"}
            onChange={(e) => aggiorna(c.nome, e.target.checked ? "on" : "")}
            className="h-4 w-4 mt-0.5 shrink-0 rounded border-gray-300 dark:border-white/20 text-accent focus:ring-accent/40"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">{c.label}</span>
        </label>
      );
    }

    return (
      <label key={c.nome} className={`flex flex-col gap-1.5 ${c.intera ? "sm:col-span-2" : ""}`}>
        <span className={labelClass}>
          {c.label}
          {c.obbligatorio && " *"}
        </span>
        {c.tipo === "select" ? (
          <select
            name={c.nome}
            required={c.obbligatorio}
            value={valore}
            onChange={(e) => aggiorna(c.nome, e.target.value)}
            className={inputClass}
          >
            <option value="">Seleziona…</option>
            {c.opzioni?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : c.tipo === "note" ? (
          <textarea
            name={c.nome}
            value={valore}
            onChange={(e) => aggiorna(c.nome, e.target.value)}
            rows={3}
            className="w-full glass-input px-3.5 py-2.5 text-sm"
          />
        ) : (
          <input
            name={c.nome}
            type={
              c.tipo === "email"
                ? "email"
                : c.tipo === "telefono"
                  ? "tel"
                  : c.tipo === "data"
                    ? "date"
                    : c.tipo === "numero"
                      ? "number"
                      : "text"
            }
            step={c.tipo === "numero" ? "0.01" : undefined}
            required={c.obbligatorio}
            value={valore}
            onChange={(e) => aggiorna(c.nome, e.target.value)}
            className={inputClass}
          />
        )}
        {c.aiuto && <span className="text-xs text-gray-500 dark:text-gray-400">{c.aiuto}</span>}
      </label>
    );
  };

  return (
    <form action={azione} className="flex flex-col gap-5">
      <input type="hidden" name="tipo" value={tipo} />

      {CAMPI_DOCUMENTO[tipo].map((sezione) => {
        const visibili = sezione.campi.filter((c) => campoVisibile(c, valori));
        if (visibili.length === 0) return null;
        return (
          <div key={sezione.titolo} className="glass-card p-4 sm:p-5 flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{sezione.titolo}</h2>
              {sezione.descrizione && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{sezione.descrizione}</p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{visibili.map(campo)}</div>
          </div>
        );
      })}

      {tipo === "contratto_vendita" && (
        <div className="glass-card p-4 sm:p-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Totale complessivo da pagare
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {prodotto ? prodotto.nome : "Nessuna versione scelta"}
              {valori.consegna === "on" ? ` + consegna ${euro(COSTO_CONSEGNA)}` : ""}
              {valori.installazione === "on" ? ` + installazione ${euro(COSTO_INSTALLAZIONE)}` : ""}
            </p>
          </div>
          <p className="text-xl font-semibold text-gray-900 dark:text-white tabular-nums">
            {euro(totale)}
          </p>
        </div>
      )}

      {stato.error && (
        <p className="rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-sm px-4 py-2.5">
          {stato.error}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <button
          type="submit"
          disabled={inCorso}
          className="inline-flex items-center justify-center gap-2 px-5 h-11 rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] text-sm font-semibold disabled:opacity-50"
        >
          {inCorso && <Loader2 size={16} className="animate-spin" />}
          Crea il documento e passa alle firme
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Il documento nasce come bozza: si chiude solo quando tutte le firme sono state raccolte.
        </p>
      </div>
    </form>
  );
}
