"use client";

import { useActionState, useEffect, useRef } from "react";
import { sendMessage, type SendMessageState } from "./actions";

const initialState: SendMessageState = { error: null, success: false };

const inputClass =
  "rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent";
const labelClass = "text-sm font-medium text-gray-700 dark:text-gray-300";

export function MessageForm() {
  const [state, formAction, pending] = useActionState(sendMessage, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>A *</span>
        <input
          name="recipient"
          required
          className={inputClass}
          placeholder="username o codice attività (es. V00012)"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Oggetto *</span>
        <input name="subject" required className={inputClass} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Messaggio *</span>
        <textarea name="body" required rows={5} className={`${inputClass} resize-none`} />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {pending ? "Invio in corso..." : "Invia"}
      </button>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 rounded-lg px-3 py-2">
          Messaggio inviato.
        </p>
      )}
    </form>
  );
}
