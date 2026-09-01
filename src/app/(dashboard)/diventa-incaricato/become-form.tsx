"use client";

import { useActionState } from "react";
import { becomeIncaricato, type BecomeIncaricatoState } from "./actions";

const initialState: BecomeIncaricatoState = { error: null };

export function BecomeForm() {
  const [state, formAction, pending] = useActionState(becomeIncaricato, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
        <input
          type="checkbox"
          name="regolamento"
          required
          className="h-4 w-4 mt-0.5 rounded border-gray-300 dark:border-white/20 text-accent focus:ring-accent/40"
        />
        <span>Ho letto e accetto il Regolamento Incaricati qui sopra.</span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {pending ? "Attivazione in corso..." : "Diventa incaricato"}
      </button>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
    </form>
  );
}
