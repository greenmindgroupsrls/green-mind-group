"use client";

import { useState } from "react";
import { ChevronDown, ClipboardList } from "lucide-react";

export type SurveyAnswer = { domanda: string; risposta: string };

// Quindici risposte non stanno in una cella di tabella: chiuse per
// impostazione, si aprono solo sul contatto che si sta guardando.
export function SurveyAnswers({ risposte }: { risposte: SurveyAnswer[] }) {
  const [aperto, setAperto] = useState(false);

  if (risposte.length === 0) return null;

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setAperto((v) => !v)}
        aria-expanded={aperto}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
      >
        <ClipboardList size={12} />
        {risposte.length} risposte
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${aperto ? "rotate-180" : ""}`}
        />
      </button>
      {aperto && (
        <dl className="mt-2 flex flex-col gap-2 rounded-lg glass-card glass-menu p-3 max-w-[320px]">
          {risposte.map((r, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <dt className="text-[11px] leading-snug text-gray-600 dark:text-gray-400">
                {r.domanda}
              </dt>
              <dd className="text-xs font-medium text-gray-900 dark:text-white">{r.risposta}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
