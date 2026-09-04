"use client";

import { useActionState, useEffect, useRef } from "react";
import { createSupportTicket, type SupportTicketState } from "./actions";
import { SUPPORT_TOPICS, supportTopicLabel } from "@/lib/support-topics";

const initialState: SupportTicketState = { error: null, success: null };

const inputClass =
  "glass-input px-3.5 py-2.5 text-sm";
const labelClass = "text-sm font-medium text-gray-700 dark:text-gray-300";

export function SupportForm() {
  const [state, formAction, pending] = useActionState(createSupportTicket, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <div className="flex flex-col gap-6">
      <form ref={formRef} action={formAction} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Argomento *</span>
          <select name="topic" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Seleziona un argomento
            </option>
            {SUPPORT_TOPICS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Messaggio *</span>
          <textarea
            name="message"
            required
            rows={6}
            className={`${inputClass} resize-none`}
            placeholder="Descrivi il problema o la tua richiesta..."
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="self-start glass-btn-primary rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Invio in corso..." : "Invia"}
        </button>

        {state.error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
            {state.error}
          </p>
        )}
      </form>

      {state.success && (
        <div className="rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="px-4 py-2.5 bg-green-50 dark:bg-green-500/10 text-sm font-medium text-green-700 dark:text-green-400">
            Ticket #{state.success.id} aperto — {supportTopicLabel(state.success.topic)}
          </div>
          <p className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
            Riceverai una email di conferma con il riepilogo della richiesta. Il nostro team ti
            contatterà entro 24 ore per risolvere il problema.
          </p>
        </div>
      )}
    </div>
  );
}
