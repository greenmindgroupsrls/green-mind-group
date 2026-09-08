"use client";

import { useActionState, useEffect, useState } from "react";
import { createEvent, updateEvent, type EventState } from "./actions";
import { EventPhotoUpload } from "./event-photo-upload";
import type { EventRow } from "@/lib/events";
import { useTesti } from "@/i18n/testi-client";

const initialState: EventState = { error: null, success: false };

const inputClass =
  "h-11 glass-input px-3.5 text-sm";
const labelClass = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase";

export function EventForm({
  event,
  directorSuggestions,
  onDone,
  onCancel,
}: {
  event: EventRow | null;
  directorSuggestions: string[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const T = useTesti().eventi;
  const action = event ? updateEvent : createEvent;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [photoUrl, setPhotoUrl] = useState<string | null>(event?.photo_url ?? null);

  useEffect(() => {
    if (state.success) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <div className="glass-card p-4 sm:p-6">
      <h2 className="font-semibold text-gray-900 dark:text-white mb-5">
        {event ? T.modificaEvento : T.nuovoEvento}
      </h2>
      <form action={formAction} className="flex flex-col gap-4">
        {event && <input type="hidden" name="id" value={event.id} />}
        <input type="hidden" name="photo_url" value={photoUrl ?? ""} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{T.citta}</span>
            <input
              name="city"
              required
              defaultValue={event?.city ?? ""}
              placeholder={T.esCitta}
              className={`${inputClass} uppercase`}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{T.data}</span>
            <input
              name="event_date"
              type="date"
              required
              defaultValue={event?.event_date ?? ""}
              className={inputClass}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>{T.luogo}</span>
          <input
            name="venue"
            defaultValue={event?.venue ?? ""}
            placeholder={T.esVenue}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>{T.indirizzo}</span>
          <input
            name="address"
            defaultValue={event?.address ?? ""}
            placeholder={T.esIndirizzo}
            className={inputClass}
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{T.orarioRegistrazioni}</span>
            <input
              name="registration_time"
              type="time"
              defaultValue={event?.registration_time ?? ""}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{T.orarioInizio}</span>
            <input
              name="start_time"
              type="time"
              defaultValue={event?.start_time ?? ""}
              className={inputClass}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>{T.note}</span>
          <textarea
            name="notes"
            rows={2}
            defaultValue={event?.notes ?? ""}
            placeholder={T.esNote}
            className={`${inputClass} h-auto py-2.5 resize-none`}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>{T.direttore}</span>
          <input
            name="director_name"
            list="director-suggestions"
            defaultValue={event?.director_name ?? ""}
            placeholder={T.nomeDirettore}
            className={inputClass}
          />
          <datalist id="director-suggestions">
            {directorSuggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </label>

        <EventPhotoUpload initialUrl={event?.photo_url} onChange={setPhotoUrl} />

        <div className="flex items-center gap-3 mt-2">
          <button
            type="submit"
            disabled={pending}
            className="glass-btn-primary rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {pending ? T.salvataggio : T.salvaEvento}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:underline"
          >
            Annulla
          </button>
          {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
        </div>
      </form>
    </div>
  );
}
