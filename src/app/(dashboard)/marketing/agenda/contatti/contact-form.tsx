"use client";

import { useActionState, useState } from "react";
import { createContact, type ContactState } from "../actions";

const initialState: ContactState = { error: null, success: false };

const inputClass =
  "h-11 glass-input px-3.5 text-sm";
const labelClass = "text-sm font-medium text-gray-700 dark:text-gray-300";

export function ContactForm() {
  const [state, formAction, pending] = useActionState(createContact, initialState);
  const [open, setOpen] = useState(false);
  const [prevSuccess, setPrevSuccess] = useState(state.success);

  // Il form si smonta quando torna a "open=false" (bottone "+ Nuovo
  // contatto"): non serve un reset esplicito, un nuovo mount riparte già
  // vuoto (input non controllati).
  if (state.success !== prevSuccess) {
    setPrevSuccess(state.success);
    if (state.success) setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="glass-btn-primary rounded-lg px-4 py-2.5 text-sm font-medium text-white"
      >
        + Nuovo contatto
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="glass-card p-6 flex flex-col gap-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Nome *</span>
          <input name="name" required className={inputClass} placeholder="Mario Rossi" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Telefono</span>
          <input name="phone" className={inputClass} placeholder="opzionale" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Email</span>
          <input name="email" type="email" className={inputClass} placeholder="opzionale" />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Note</span>
        <textarea name="notes" rows={2} className={`${inputClass} h-auto py-2.5 resize-none`} />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="glass-btn-primary rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Salvataggio..." : "Salva contatto"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:underline"
        >
          Annulla
        </button>
      </div>
      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
    </form>
  );
}
