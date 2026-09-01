"use client";

import { useActionState, useState } from "react";
import { Trash2, Pencil, CalendarClock, Repeat } from "lucide-react";
import { toggleTaskDone, deleteTask, updateTask, type TaskState } from "./actions";
import {
  TASK_RECURRENCES,
  TASK_RECURRENCE_LABEL,
  CONTACT_STATUS_LABEL,
  CONTACT_STATUS_BADGE_CLASS,
  type Contact,
  type ContactStatus,
  type TaskKind,
  type TaskRecurrence,
} from "@/lib/crm";

const initialState: TaskState = { error: null, success: false };

const inputClass =
  "h-10 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent";
const labelClass = "text-xs font-medium text-gray-700 dark:text-gray-300";

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function TaskItem({
  id,
  title,
  done,
  contactId,
  contactName,
  contactStatus,
  dueAtIso,
  time,
  kind,
  notes,
  recurrence,
  contacts,
}: {
  id: number;
  title: string;
  done: boolean;
  contactId: number | null;
  contactName: string | null;
  contactStatus: ContactStatus | null;
  dueAtIso: string;
  time: string;
  kind: TaskKind;
  notes: string | null;
  recurrence: TaskRecurrence;
  contacts: Contact[];
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateTask, initialState);

  if (editing) {
    return (
      <form
        action={async (formData) => {
          await formAction(formData);
          setEditing(false);
        }}
        className="flex flex-col gap-2.5 px-4 py-3 bg-gray-50 dark:bg-white/5"
      >
        <input type="hidden" name="id" value={id} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Titolo</span>
            <input name="title" defaultValue={title} required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Quando</span>
            <input
              name="due_at"
              type="datetime-local"
              defaultValue={toLocalInputValue(dueAtIso)}
              required
              className={inputClass}
            />
          </label>
          {contacts.length > 0 && (
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Contatto</span>
              <select name="contact_id" defaultValue={contactId ?? ""} className={inputClass}>
                <option value="">Nessuno</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Ripeti</span>
            <select name="recurrence" defaultValue={recurrence} className={inputClass}>
              {TASK_RECURRENCES.map((r) => (
                <option key={r} value={r}>
                  {TASK_RECURRENCE_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Note</span>
          <textarea
            name="notes"
            defaultValue={notes ?? ""}
            rows={2}
            className={`${inputClass} h-auto py-2 resize-none`}
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {pending ? "Salvataggio..." : "Salva"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:underline"
          >
            Annulla
          </button>
          {state.error && <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>}
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <input
        type="checkbox"
        checked={done}
        onChange={(e) => toggleTaskDone(id, e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 dark:border-white/20 text-accent focus:ring-accent/40 shrink-0"
      />
      {kind === "appuntamento" && (
        <CalendarClock size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm ${done ? "text-gray-400 dark:text-gray-500 line-through" : "text-gray-900 dark:text-white font-medium"}`}
        >
          {title}
        </p>
        {(contactName || notes) && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {contactName}
            {contactName && notes && " · "}
            {notes}
          </p>
        )}
      </div>
      {contactStatus && (
        <div className="w-32 shrink-0 hidden sm:flex justify-center">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${CONTACT_STATUS_BADGE_CLASS[contactStatus]}`}
          >
            {CONTACT_STATUS_LABEL[contactStatus]}
          </span>
        </div>
      )}
      {recurrence !== "none" && (
        <Repeat size={13} className="text-gray-400 dark:text-gray-500 shrink-0" aria-label={TASK_RECURRENCE_LABEL[recurrence]} />
      )}
      <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{time}</span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-gray-300 hover:text-accent dark:text-gray-600 dark:hover:text-accent shrink-0"
        aria-label="Modifica"
      >
        <Pencil size={14} />
      </button>
      <button
        type="button"
        onClick={() => deleteTask(id)}
        className="text-gray-300 hover:text-red-600 dark:text-gray-600 dark:hover:text-red-400 shrink-0"
        aria-label="Elimina"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
