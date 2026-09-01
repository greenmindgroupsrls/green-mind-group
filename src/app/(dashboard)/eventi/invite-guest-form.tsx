"use client";

import { useActionState, useState } from "react";
import { Mic, Laptop } from "lucide-react";
import { inviteGuest, type GuestState } from "./actions";
import { formatActivityCode } from "@/lib/activity-code";
import type { EventRow, InviteType } from "@/lib/events";

const initialState: GuestState = { error: null, success: false };

const inputClass =
  "h-11 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent";
const labelClass = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase";

const TYPE_OPTIONS: { value: InviteType; label: string; sub: string; icon: typeof Mic }[] = [
  { value: "live", label: "Live", sub: "In sala", icon: Mic },
  { value: "zoom", label: "Zoom", sub: "Online", icon: Laptop },
];

function formatEventOption(ev: EventRow) {
  return `${ev.event_date} — ${ev.city}${ev.venue ? ` — ${ev.venue}` : ""}`;
}

export function InviteGuestForm({
  events,
  preselectedEventId,
  currentMember,
  onDone,
}: {
  events: EventRow[];
  preselectedEventId: number | null;
  currentMember: { activity_code: number; username: string };
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(inviteGuest, initialState);
  const [inviteType, setInviteType] = useState<InviteType>("live");
  const [prevSuccess, setPrevSuccess] = useState(state.success);

  if (state.success !== prevSuccess) {
    setPrevSuccess(state.success);
    if (state.success) onDone();
  }

  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
        Invitante: <span className="font-medium text-accent">{formatActivityCode(currentMember.activity_code)}</span>{" "}
        — {currentMember.username}
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        <div>
          <span className={labelClass}>Tipo evento *</span>
          <div className="grid grid-cols-2 gap-3 mt-1.5">
            {TYPE_OPTIONS.map(({ value, label, sub, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setInviteType(value)}
                className={`flex flex-col items-center gap-1 rounded-lg border p-4 transition-colors ${
                  inviteType === value
                    ? "border-accent bg-accent/5 text-accent"
                    : "border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-white/20"
                }`}
              >
                <Icon size={20} />
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-[11px]">{sub}</span>
              </button>
            ))}
          </div>
          <input type="hidden" name="invite_type" value={inviteType} />
        </div>

        {inviteType === "live" && (
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Evento Live *</span>
            <select name="event_id" required defaultValue={preselectedEventId ?? ""} className={inputClass}>
              <option value="" disabled>
                — Seleziona —
              </option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {formatEventOption(ev)}
                </option>
              ))}
            </select>
            {events.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Nessun evento Live in programma al momento.
              </p>
            )}
          </label>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Cognome *</span>
            <input name="last_name" required placeholder="Cognome" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Nome *</span>
            <input name="first_name" required placeholder="Nome" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Telefono *</span>
            <input name="phone" required placeholder="+39..." className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Email *</span>
            <input name="email" type="email" required placeholder="email@..." className={inputClass} />
          </label>
        </div>

        <label className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            name="gdpr_consent"
            required
            className="h-4 w-4 mt-0.5 rounded border-gray-300 dark:border-white/20 text-accent focus:ring-accent/40"
          />
          <span>Acconsento al trattamento dei dati personali (GDPR) *</span>
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending || (inviteType === "live" && events.length === 0)}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {pending ? "Invio..." : "Invita ospite"}
          </button>
          {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
        </div>
      </form>
    </div>
  );
}
