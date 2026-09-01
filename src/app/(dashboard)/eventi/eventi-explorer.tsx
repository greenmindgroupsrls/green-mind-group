"use client";

import { useMemo, useState } from "react";
import { Plus, UserPlus } from "lucide-react";
import { EventList } from "./event-list";
import { EventForm } from "./event-form";
import { InviteGuestForm } from "./invite-guest-form";
import { GuestArchive } from "./guest-archive";
import { SlidePanel } from "./slide-panel";
import type { EventGuest, EventRow } from "@/lib/events";

type Tab = "prossimi" | "archivio" | "ospiti";

const TABS: { id: Tab; label: string }[] = [
  { id: "prossimi", label: "Prossimi eventi" },
  { id: "archivio", label: "Archivio eventi" },
  { id: "ospiti", label: "Ospiti" },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function EventiExplorer({
  events,
  guests,
  isRoot,
  currentMember,
  memberNameByCode,
}: {
  events: EventRow[];
  guests: EventGuest[];
  isRoot: boolean;
  currentMember: { activity_code: number; username: string };
  memberNameByCode: Record<number, string>;
}) {
  const [tab, setTab] = useState<Tab>("prossimi");
  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null);
  const [invitePanelEvent, setInvitePanelEvent] = useState<EventRow | "generic" | null>(null);

  const today = todayIso();
  const upcoming = useMemo(
    () => events.filter((e) => e.event_date >= today).sort((a, b) => a.event_date.localeCompare(b.event_date)),
    [events, today],
  );
  const past = useMemo(
    () => events.filter((e) => e.event_date < today).sort((a, b) => b.event_date.localeCompare(a.event_date)),
    [events, today],
  );

  const guestCounts = useMemo(() => {
    const map: Record<number, { invited: number; confirmed: number }> = {};
    for (const g of guests) {
      if (!g.event_id) continue;
      const entry = map[g.event_id] ?? { invited: 0, confirmed: 0 };
      entry.invited += 1;
      if (g.status === "confermato") entry.confirmed += 1;
      map[g.event_id] = entry;
    }
    return map;
  }, [guests]);

  const directorSuggestions = useMemo(
    () => Array.from(new Set(events.map((e) => e.director_name).filter((n): n is string => !!n))),
    [events],
  );

  function handleNewEvent() {
    setEditingEvent(null);
    setEventFormOpen(true);
  }

  function handleEditEvent(ev: EventRow) {
    setEditingEvent(ev);
    setEventFormOpen(true);
  }

  function handleInviteToEvent(ev: EventRow) {
    setInvitePanelEvent(ev);
  }

  const preselectedEventId = invitePanelEvent && invitePanelEvent !== "generic" ? invitePanelEvent.id : null;

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex gap-1 border-b border-gray-200 dark:border-white/10">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id
                ? "border-accent text-accent"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {(tab === "prossimi" || tab === "archivio") && isRoot && (
        <div>
          {eventFormOpen ? (
            <EventForm
              event={editingEvent}
              directorSuggestions={directorSuggestions}
              onDone={() => {
                setEditingEvent(null);
                setEventFormOpen(false);
              }}
              onCancel={() => {
                setEditingEvent(null);
                setEventFormOpen(false);
              }}
            />
          ) : (
            <button
              type="button"
              onClick={handleNewEvent}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              <Plus size={16} /> Nuovo evento
            </button>
          )}
        </div>
      )}

      {tab === "prossimi" && !eventFormOpen && (
        <EventList
          events={upcoming}
          isRoot={isRoot}
          guestCounts={guestCounts}
          emptyLabel="Nessun evento in programma."
          onEdit={handleEditEvent}
          onInvite={handleInviteToEvent}
        />
      )}

      {tab === "archivio" && !eventFormOpen && (
        <EventList
          events={past}
          isRoot={isRoot}
          guestCounts={guestCounts}
          emptyLabel="Nessun evento passato."
          onEdit={handleEditEvent}
          onInvite={handleInviteToEvent}
        />
      )}

      {tab === "ospiti" && (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setInvitePanelEvent("generic")}
            className="flex items-center gap-2 self-start rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            <UserPlus size={16} /> Invita ospite
          </button>
          <GuestArchive guests={guests} events={events} isRoot={isRoot} memberNameByCode={memberNameByCode} />
        </div>
      )}

      <SlidePanel open={invitePanelEvent !== null} onClose={() => setInvitePanelEvent(null)} title="Invita ospite">
        {invitePanelEvent !== null && (
          <InviteGuestForm
            key={preselectedEventId ?? "generic"}
            events={upcoming}
            preselectedEventId={preselectedEventId}
            currentMember={currentMember}
            onDone={() => setInvitePanelEvent(null)}
          />
        )}
      </SlidePanel>
    </div>
  );
}
