"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createTask, type TaskState } from "./actions";
import { TASK_RECURRENCES, TASK_RECURRENCE_LABEL, type Contact } from "@/lib/crm";

const initialState: TaskState = { error: null, success: false };

const inputClass =
  "h-11 glass-input px-3.5 text-sm";
const labelClass = "text-sm font-medium text-gray-700 dark:text-gray-300";

function defaultDueAt() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function TaskForm({ contacts }: { contacts: Contact[] }) {
  const [state, formAction, pending] = useActionState(createTask, initialState);
  const [showExtra, setShowExtra] = useState(false);
  const [prevSuccess, setPrevSuccess] = useState(state.success);
  const formRef = useRef<HTMLFormElement>(null);

  if (state.success !== prevSuccess) {
    setPrevSuccess(state.success);
    if (state.success) setShowExtra(false);
  }

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1.5 flex-1">
          <span className={labelClass}>Nuova attività</span>
          <input name="title" required placeholder="es. Richiama Mario" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Quando</span>
          <input
            name="due_at"
            type="datetime-local"
            required
            defaultValue={defaultDueAt()}
            className={inputClass}
          />
        </label>
        {contacts.length > 0 && (
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Contatto</span>
            <select name="contact_id" defaultValue="" className={inputClass}>
              <option value="">Nessuno</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-lg bg-accent px-5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {pending ? "Aggiunta..." : "Aggiungi"}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setShowExtra((v) => !v)}
        className="self-start text-xs font-medium text-accent hover:underline"
      >
        {showExtra ? "Nascondi dettagli" : "+ Note e ripetizione"}
      </button>

      {showExtra && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Note</span>
            <textarea name="notes" rows={2} className={`${inputClass} h-auto py-2.5 resize-none`} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Ripeti</span>
            <select name="recurrence" defaultValue="none" className={inputClass}>
              {TASK_RECURRENCES.map((r) => (
                <option key={r} value={r}>
                  {TASK_RECURRENCE_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
    </form>
  );
}
