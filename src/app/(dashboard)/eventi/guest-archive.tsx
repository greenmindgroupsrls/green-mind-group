"use client";

import { useActionState, useMemo, useState } from "react";
import { Search, Pencil, Trash2 } from "lucide-react";
import { updateGuest, updateGuestStatus, deleteGuest, type GuestState } from "./actions";
import {
  INVITE_TYPE_LABEL,
  INVITE_TYPE_BADGE_CLASS,
  GUEST_STATUS_LABEL,
  GUEST_STATUS_BADGE_CLASS,
  type EventGuest,
  type EventRow,
  type GuestStatus,
} from "@/lib/events";

const guestInitialState: GuestState = { error: null, success: false };

const cellInputClass =
  "h-9 w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

function GuestRow({
  guest,
  event,
  isRoot,
  inviterName,
}: {
  guest: EventGuest;
  event: EventRow | undefined;
  isRoot: boolean;
  inviterName: string;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateGuest, guestInitialState);

  if (editing) {
    return (
      <tr className="border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5">
        <td colSpan={isRoot ? 7 : 6} className="px-4 py-3">
          <form
            action={async (formData) => {
              await formAction(formData);
              setEditing(false);
            }}
            className="flex flex-wrap items-end gap-2.5"
          >
            <input type="hidden" name="id" value={guest.id} />
            <label className="flex flex-col gap-1 w-32">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">Cognome</span>
              <input name="last_name" defaultValue={guest.last_name} required className={cellInputClass} />
            </label>
            <label className="flex flex-col gap-1 w-32">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">Nome</span>
              <input name="first_name" defaultValue={guest.first_name} required className={cellInputClass} />
            </label>
            <label className="flex flex-col gap-1 w-36">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">Telefono</span>
              <input name="phone" defaultValue={guest.phone} required className={cellInputClass} />
            </label>
            <label className="flex flex-col gap-1 w-48">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">Email</span>
              <input name="email" type="email" defaultValue={guest.email} required className={cellInputClass} />
            </label>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={pending}
                className="h-9 rounded-lg bg-accent px-3 text-xs font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {pending ? "Salvataggio..." : "Salva"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="h-9 rounded-lg px-3 text-xs font-medium text-gray-500 dark:text-gray-400 hover:underline"
              >
                Annulla
              </button>
            </div>
            {state.error && <p className="text-xs text-red-600 dark:text-red-400 w-full">{state.error}</p>}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-gray-100 dark:border-white/5">
      <td className="px-4 py-3 text-gray-900 dark:text-white font-medium whitespace-nowrap">
        {guest.last_name}
      </td>
      <td className="px-4 py-3 text-gray-900 dark:text-white whitespace-nowrap">{guest.first_name}</td>
      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{guest.phone}</td>
      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{guest.email}</td>
      <td className="px-4 py-3">
        <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${INVITE_TYPE_BADGE_CLASS[guest.invite_type]}`}>
          {INVITE_TYPE_LABEL[guest.invite_type]}
        </span>
        {event && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 whitespace-nowrap">{event.city}</p>}
      </td>
      {isRoot && (
        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{inviterName}</td>
      )}
      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {formatDate(guest.created_at)}
      </td>
      <td className="px-4 py-3">
        {isRoot ? (
          <select
            value={guest.status}
            onChange={(e) => updateGuestStatus(guest.id, e.target.value as GuestStatus)}
            className="h-8 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
          >
            <option value="invitato">{GUEST_STATUS_LABEL.invitato}</option>
            <option value="confermato">{GUEST_STATUS_LABEL.confermato}</option>
          </select>
        ) : (
          <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${GUEST_STATUS_BADGE_CLASS[guest.status]}`}>
            {GUEST_STATUS_LABEL[guest.status]}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-gray-300 hover:text-accent dark:text-gray-600 dark:hover:text-accent"
            aria-label="Modifica ospite"
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Eliminare ${guest.first_name} ${guest.last_name} dagli ospiti?`)) deleteGuest(guest.id);
            }}
            className="text-gray-300 hover:text-red-600 dark:text-gray-600 dark:hover:text-red-400"
            aria-label="Elimina ospite"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export function GuestArchive({
  guests,
  events,
  isRoot,
  memberNameByCode,
}: {
  guests: EventGuest[];
  events: EventRow[];
  isRoot: boolean;
  memberNameByCode: Record<number, string>;
}) {
  const [query, setQuery] = useState("");
  const eventById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter((g) =>
      `${g.first_name} ${g.last_name} ${g.phone} ${g.email}`.toLowerCase().includes(q),
    );
  }, [guests, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative sm:w-80">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca ospite"
          className="w-full pl-9 pr-3 h-11 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
        />
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                <th className="px-4 py-3 font-medium">Cognome</th>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Telefono</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                {isRoot && <th className="px-4 py-3 font-medium">Invitato da</th>}
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Stato</th>
                <th className="px-4 py-3 font-medium">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <GuestRow
                  key={g.id}
                  guest={g}
                  event={g.event_id ? eventById.get(g.event_id) : undefined}
                  isRoot={isRoot}
                  inviterName={memberNameByCode[g.inviter_code] ?? "—"}
                />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isRoot ? 9 : 8} className="px-6 py-8 text-center text-gray-400 dark:text-gray-500">
                    {guests.length === 0 ? "Nessun ospite invitato ancora." : "Nessun ospite trovato."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
