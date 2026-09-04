"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { SlidePanel } from "../../eventi/slide-panel";
import { InviteGuestForm } from "../../eventi/invite-guest-form";
import type { EventRow } from "@/lib/events";

function formatEventDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return {
    day: d.toLocaleDateString("it-IT", { day: "2-digit" }),
    month: d.toLocaleDateString("it-IT", { month: "short" }).toUpperCase(),
    year: d.toLocaleDateString("it-IT", { year: "numeric" }),
  };
}

export function MarketingEventsList({
  events,
  currentMember,
}: {
  events: EventRow[];
  currentMember: { activity_code: number; username: string };
}) {
  const [invitePanelEvent, setInvitePanelEvent] = useState<EventRow | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-semibold text-gray-900 dark:text-white">Eventi in programma</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Invita i tuoi ospiti agli eventi Live organizzati dall&apos;azienda.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">Nessun evento in programma al momento.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((ev) => {
            const date = formatEventDate(ev.event_date);
            return (
              <div
                key={ev.id}
                className="glass-card p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex items-center gap-5 flex-1 min-w-0">
                  <div className="shrink-0 w-16 text-center rounded-lg bg-accent/10 py-2">
                    <p className="text-[10px] font-semibold text-accent uppercase">{date.month}</p>
                    <p className="text-2xl font-bold text-accent leading-none mt-0.5">{date.day}</p>
                    <p className="text-[10px] text-accent/80 mt-0.5">{date.year}</p>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white uppercase">{ev.city}</h3>
                    {ev.venue && <p className="text-sm text-gray-600 dark:text-gray-300">{ev.venue}</p>}
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {ev.registration_time && (
                        <span>
                          Registrazioni:{" "}
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {ev.registration_time}
                          </span>
                        </span>
                      )}
                      {ev.start_time && (
                        <span>
                          Inizio:{" "}
                          <span className="font-medium text-gray-700 dark:text-gray-300">{ev.start_time}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setInvitePanelEvent(ev)}
                  className="flex items-center justify-center gap-1.5 glass-btn-primary rounded-lg px-4 py-2.5 text-sm font-medium shrink-0"
                >
                  <UserPlus size={15} /> Invita Ospite
                </button>
              </div>
            );
          })}
        </div>
      )}

      <SlidePanel open={invitePanelEvent !== null} onClose={() => setInvitePanelEvent(null)} title="Invita ospite">
        {invitePanelEvent && (
          <InviteGuestForm
            key={invitePanelEvent.id}
            events={events}
            preselectedEventId={invitePanelEvent.id}
            currentMember={currentMember}
            onDone={() => setInvitePanelEvent(null)}
          />
        )}
      </SlidePanel>
    </div>
  );
}
