"use client";

import { Pencil, Trash2, UserPlus } from "lucide-react";
import { deleteEvent } from "./actions";
import type { EventRow } from "@/lib/events";

function formatEventDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return {
    day: d.toLocaleDateString("it-IT", { day: "2-digit" }),
    month: d.toLocaleDateString("it-IT", { month: "short" }).toUpperCase(),
    year: d.toLocaleDateString("it-IT", { year: "numeric" }),
    weekday: d.toLocaleDateString("it-IT", { weekday: "long" }),
  };
}

export function EventList({
  events,
  isRoot,
  guestCounts,
  emptyLabel,
  onEdit,
  onInvite,
}: {
  events: EventRow[];
  isRoot: boolean;
  guestCounts: Record<number, { invited: number; confirmed: number }>;
  emptyLabel: string;
  onEdit: (event: EventRow) => void;
  onInvite: (event: EventRow) => void;
}) {
  if (events.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {events.map((ev) => {
        const date = formatEventDate(ev.event_date);
        const counts = guestCounts[ev.id] ?? { invited: 0, confirmed: 0 };
        return (
          <div
            key={ev.id}
            className="glass-card p-5 flex items-start gap-5"
          >
            <div className="shrink-0 w-16 text-center rounded-lg bg-accent/10 py-2">
              <p className="text-[10px] font-semibold text-accent uppercase">{date.month}</p>
              <p className="text-2xl font-bold text-accent leading-none mt-0.5">{date.day}</p>
              <p className="text-[10px] text-accent/80 mt-0.5">{date.year}</p>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white uppercase">{ev.city}</h3>
                  {ev.venue && <p className="text-sm text-gray-600 dark:text-gray-300">{ev.venue}</p>}
                  {ev.address && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{ev.address}</p>
                  )}
                </div>
                {isRoot && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEdit(ev)}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-accent hover:bg-accent/10 transition-colors"
                      aria-label="Modifica evento"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Eliminare l'evento di ${ev.city}?`)) deleteEvent(ev.id);
                      }}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      aria-label="Elimina evento"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                {ev.registration_time && (
                  <span>
                    Registrazioni: <span className="font-medium text-gray-700 dark:text-gray-300">{ev.registration_time}</span>
                  </span>
                )}
                {ev.start_time && (
                  <span>
                    Inizio: <span className="font-medium text-gray-700 dark:text-gray-300">{ev.start_time}</span>
                  </span>
                )}
              </div>

              {ev.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{ev.notes}</p>}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {ev.director_name && (
                    <span className="mr-3">
                      Direttore: <span className="font-medium text-gray-700 dark:text-gray-300">{ev.director_name}</span>
                    </span>
                  )}
                  {isRoot ? (
                    <span>
                      Invitati: <span className="font-medium text-gray-700 dark:text-gray-300">{counts.invited}</span>
                      {" · "}Confermati: <span className="font-medium text-gray-700 dark:text-gray-300">{counts.confirmed}</span>
                    </span>
                  ) : (
                    <span>
                      I tuoi invitati: <span className="font-medium text-gray-700 dark:text-gray-300">{counts.invited}</span>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onInvite(ev)}
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity shrink-0"
                >
                  <UserPlus size={13} /> Invita Ospite
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
