"use client";

import { useActionState } from "react";
import { changePassword, type PasswordState } from "./actions";
import { PasswordInput } from "@/components/password-input";

const initialState: PasswordState = { error: null, success: false };

const inputClass =
  "glass-input px-3.5 py-2.5 text-sm";
const labelClass = "text-sm font-medium text-gray-700 dark:text-gray-300";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Nuova password</span>
        <PasswordInput
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
          placeholder="almeno 8 caratteri"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Conferma nuova password</span>
        <PasswordInput
          name="confirm"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="self-start glass-btn-primary rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {pending ? "Aggiornamento..." : "Cambia password"}
      </button>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 rounded-lg px-3 py-2">
          Password aggiornata.
        </p>
      )}
    </form>
  );
}
