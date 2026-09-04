"use client";

import { useState, useTransition } from "react";
import { Trash2, Check, X } from "lucide-react";
import { deleteLead } from "./actions";

// Cancellare un lead non si annulla, quindi non basta un clic: il cestino
// apre una conferma sul posto. Niente finestra del browser, che qui
// stonerebbe e non si puo' nemmeno tradurre.
export function LeadDeleteAction({ id, nome }: { id: number; nome: string }) {
  const [chiede, setChiede] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, avvia] = useTransition();

  if (!chiede) {
    return (
      <button
        type="button"
        onClick={() => { setChiede(true); setErrore(null); }}
        title={`Elimina il lead di ${nome}`}
        aria-label={`Elimina il lead di ${nome}`}
        className="h-7 w-7 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"
      >
        <Trash2 size={14} />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={inCorso}
          onClick={() =>
            avvia(async () => {
              try {
                await deleteLead(id);
              } catch (e) {
                setErrore(e instanceof Error ? e.message : "Eliminazione non riuscita");
                setChiede(false);
              }
            })
          }
          className="h-7 px-2 rounded-md flex items-center gap-1 text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          <Check size={12} />
          {inCorso ? "..." : "Elimina"}
        </button>
        <button
          type="button"
          disabled={inCorso}
          onClick={() => setChiede(false)}
          aria-label="Annulla"
          className="h-7 w-7 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-[var(--glass-bg)] transition-colors"
        >
          <X size={13} />
        </button>
      </div>
      {errore && <span className="text-[11px] text-red-600 dark:text-red-400">{errore}</span>}
    </div>
  );
}
