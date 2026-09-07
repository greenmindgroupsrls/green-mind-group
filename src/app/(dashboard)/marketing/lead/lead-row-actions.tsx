"use client";

import { useState, useTransition } from "react";
import { updateLeadStatus } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  nuovo: "Nuovo",
  contattato: "Contattato",
  convertito: "Convertito",
  perso: "Perso",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  nuovo: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  contattato: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  convertito: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  perso: "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400",
};

export function LeadRowActions({ id, status }: { id: number; status: string }) {
  const [pending, startTransition] = useTransition();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [error, setError] = useState<string | null>(null);

  function handleStatusChange(next: string) {
    const previous = currentStatus;
    setCurrentStatus(next);
    setError(null);
    startTransition(async () => {
      try {
        await updateLeadStatus(id, next);
      } catch (e) {
        setCurrentStatus(previous);
        setError(e instanceof Error ? e.message : "Errore imprevisto");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-[190px]">
      <div className="flex items-center gap-2">
        <span
          className={`shrink-0 text-xs font-medium rounded-full px-2.5 py-1 ${STATUS_BADGE_CLASS[currentStatus]}`}
        >
          {STATUS_LABEL[currentStatus]}
        </span>
        <select
          value={currentStatus}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={pending}
          className="text-xs glass-input rounded-md text-gray-700 dark:text-gray-300 px-1.5 py-1 disabled:opacity-50"
        >
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {error && <span className="text-[11px] text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
