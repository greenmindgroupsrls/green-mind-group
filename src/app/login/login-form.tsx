"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type LoginState } from "./actions";
import { PasswordInput } from "@/components/password-input";
import type { Dizionario } from "@/i18n/dizionario";

const initialState: LoginState = { error: null };

export function LoginForm({ next, t }: { next: string; t: Dizionario["accesso"] }) {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.email}</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="glass-input px-3.5 py-2.5 text-sm"
          placeholder={t.emailSegnaposto}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.password}</span>
          <Link href="/password-dimenticata" className="text-sm text-accent hover:underline">
            {t.passwordDimenticata}
          </Link>
        </div>
        <PasswordInput
          name="password"
          required
          autoComplete="current-password"
          className="glass-input px-3.5 py-2.5 text-sm"
          placeholder={t.passwordSegnaposto}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="glass-btn-primary rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {pending ? t.accessoInCorso : t.accedi}
      </button>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
    </form>
  );
}
