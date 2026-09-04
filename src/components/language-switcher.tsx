"use client";

import { useState, useTransition } from "react";
import { Check, Globe, Loader2 } from "lucide-react";
import { cambiaLingua } from "@/app/lingua-actions";
import { LINGUE, NOME_LINGUA, BANDIERA, type Lingua } from "@/i18n/config";

export function LanguageSwitcher({
  corrente,
  etichetta,
  compatto = false,
}: {
  corrente: Lingua;
  etichetta: string;
  compatto?: boolean;
}) {
  const [aperto, setAperto] = useState(false);
  const [inCorso, startTransition] = useTransition();

  function scegli(lingua: Lingua) {
    setAperto(false);
    if (lingua === corrente) return;
    startTransition(() => {
      void cambiaLingua(lingua);
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAperto((v) => !v)}
        disabled={inCorso}
        aria-haspopup="listbox"
        aria-expanded={aperto}
        aria-label={etichetta}
        className={`flex items-center gap-2 rounded-lg glass-btn-soft text-gray-700 dark:text-gray-300 disabled:opacity-50 ${
          compatto ? "h-9 px-2.5 text-sm" : "h-10 px-3.5 text-sm w-full justify-between"
        }`}
      >
        <span className="flex items-center gap-2">
          {inCorso ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Globe size={15} className="text-gray-500 dark:text-gray-400" />
          )}
          <span aria-hidden="true">{BANDIERA[corrente]}</span>
          {!compatto && <span>{NOME_LINGUA[corrente]}</span>}
        </span>
      </button>

      {aperto && (
        <>
          {/* Uno strato invisibile che chiude la tendina cliccando altrove:
              senza, resta aperta e copre il contenuto sotto. */}
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setAperto(false)}
          />
          <ul
            role="listbox"
            className="absolute right-0 z-50 mt-1 w-44 glass-card glass-panel rounded-lg shadow-lg py-1"
          >
            {LINGUE.map((lingua) => (
              <li key={lingua}>
                <button
                  type="button"
                  role="option"
                  aria-selected={lingua === corrente}
                  onClick={() => scegli(lingua)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <span aria-hidden="true">{BANDIERA[lingua]}</span>
                  <span className="flex-1 text-left">{NOME_LINGUA[lingua]}</span>
                  {lingua === corrente && <Check size={14} className="text-accent" />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
