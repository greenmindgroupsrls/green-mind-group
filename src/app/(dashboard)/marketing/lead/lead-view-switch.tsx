"use client";

import { useState } from "react";
import { List, CalendarDays } from "lucide-react";
import { LeadCalendar, type CalendarLead } from "./lead-calendar";

// Elenco e calendario mostrano gli stessi lead da due angolazioni: la
// tabella serve a gestirli (stato, note, inoltro), il calendario a vedere
// quando cadono gli appuntamenti. La tabella arriva gia' renderizzata dal
// server, il calendario ha bisogno del client per navigare tra i mesi.
export function LeadViewSwitch({
  tabella,
  leads,
}: {
  tabella: React.ReactNode;
  leads: CalendarLead[];
}) {
  const [vista, setVista] = useState<"elenco" | "calendario">("elenco");

  const conAppuntamento = leads.filter((l) => l.appointmentAt || l.requestedDate).length;

  return (
    <div className="flex flex-col">
      <div className="px-6 py-3 border-b border-gray-200 dark:border-white/10 flex items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 p-1">
          {(
            [
              ["elenco", "Elenco", List],
              ["calendario", "Calendario", CalendarDays],
            ] as const
          ).map(([k, label, Icon]) => (
            <button
              key={k}
              type="button"
              onClick={() => setVista(k)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                vista === k
                  ? "bg-accent text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
        {vista === "calendario" && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {conAppuntamento} con data · {leads.length - conAppuntamento} senza
          </span>
        )}
      </div>

      {vista === "elenco" ? tabella : <div className="p-6">
        <LeadCalendar leads={leads} />
      </div>}
    </div>
  );
}
