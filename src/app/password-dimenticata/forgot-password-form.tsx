"use client";

import { useActionState } from "react";
import { requestPasswordReset, type RequestResetState } from "@/app/login/actions";

const initialState: RequestResetState = { error: null, sent: false };

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  if (state.sent) {
    return (
      <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 rounded-lg px-3 py-2">
        Se l&apos;email corrisponde a un account, riceverai a breve un link per reimpostare la
        password.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="glass-input px-3.5 py-2.5 text-sm"
          placeholder="tu@esempio.it"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="glass-btn-primary rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Invio in corso..." : "Invia link di reset"}
      </button>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
    </form>
  );
}
