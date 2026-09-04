"use client";

import { useState, useTransition } from "react";
import { BadgeEuro, Check, X, AlertCircle } from "lucide-react";
import { confirmOrderPayment } from "./actions";

// Confermare un pagamento fa nascere le provvigioni e non si annulla:
// quindi chiede conferma, e dice esplicitamente cosa sta per succedere.
export function ConfirmPaymentButton({ id, totale }: { id: number; totale: string }) {
  const [chiede, setChiede] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [inCorso, avvia] = useTransition();

  if (!chiede) {
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => { setChiede(true); setErrore(null); }}
          className="glass-btn-primary rounded-lg px-3 py-1.5 text-xs font-medium text-white inline-flex items-center gap-1.5 w-fit"
        >
          <BadgeEuro size={13} />
          Conferma pagamento
        </button>
        {errore && (
          <span className="flex items-start gap-1 text-[11px] text-red-600 dark:text-red-400">
            <AlertCircle size={11} className="mt-0.5 shrink-0" />
            {errore}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[11px] text-gray-600 dark:text-gray-300 max-w-[210px] leading-snug">
        Confermi di aver incassato <strong>{totale}</strong>? Da qui nascono le provvigioni, e non
        si torna indietro.
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={inCorso}
          onClick={() =>
            avvia(async () => {
              try {
                await confirmOrderPayment(id);
              } catch (e) {
                setErrore(e instanceof Error ? e.message : "Conferma non riuscita");
                setChiede(false);
              }
            })
          }
          className="glass-btn-primary rounded-lg px-3 py-1.5 text-xs font-medium text-white inline-flex items-center gap-1"
        >
          <Check size={12} />
          {inCorso ? "..." : "Sì, incassato"}
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
    </div>
  );
}
