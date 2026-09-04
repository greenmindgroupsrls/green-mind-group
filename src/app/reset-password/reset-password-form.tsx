"use client";

import { useActionState } from "react";
import { updatePassword, type UpdatePasswordState } from "@/app/login/actions";
import { PasswordInput } from "@/components/password-input";

const initialState: UpdatePasswordState = { error: null };

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Nuova password
        </span>
        <PasswordInput
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="glass-input px-3.5 py-2.5 text-sm"
          placeholder="almeno 8 caratteri"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Conferma password
        </span>
        <PasswordInput
          name="confirm_password"
          required
          minLength={8}
          autoComplete="new-password"
          className="glass-input px-3.5 py-2.5 text-sm"
          placeholder="ripeti la password"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="glass-btn-primary rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Salvataggio..." : "Salva nuova password"}
      </button>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
    </form>
  );
}
