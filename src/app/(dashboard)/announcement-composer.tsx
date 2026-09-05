"use client";

import { useActionState, useState } from "react";
import { postAnnouncement, type AnnouncementState } from "./announcement-actions";

const initialState: AnnouncementState = { error: null, success: false };

const inputClass =
  "glass-input px-3.5 py-2 text-sm";

export function AnnouncementComposer() {
  const [state, formAction, pending] = useActionState(postAnnouncement, initialState);
  const [open, setOpen] = useState(false);
  const [prevSuccess, setPrevSuccess] = useState(state.success);

  if (state.success !== prevSuccess) {
    setPrevSuccess(state.success);
    if (state.success) setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-accent hover:underline"
      >
        + Nuovo annuncio
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-2.5 w-full">
      <input name="title" required placeholder="Titolo" className={inputClass} />
      <textarea name="body" required rows={2} placeholder="Testo dell'annuncio" className={`${inputClass} resize-none`} />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="glass-btn-primary rounded-lg px-3.5 py-2 text-xs font-medium disabled:opacity-50"
        >
          {pending ? "Pubblicazione..." : "Pubblica"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:underline"
        >
          Annulla
        </button>
      </div>
      {state.error && <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>}
    </form>
  );
}
