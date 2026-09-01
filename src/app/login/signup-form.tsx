"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signUp, type SignUpState } from "./actions";
import { LockedRefField } from "@/components/locked-ref-field";
import { PasswordInput } from "@/components/password-input";
import {
  RegistrationRoleFields,
  type MemberRoleChoice,
  type AccountTypeChoice,
} from "@/components/registration-role-fields";

const initialState: SignUpState = { error: null, checkEmail: false };

const inputClass =
  "rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent";
const labelClass = "text-sm font-medium text-gray-700 dark:text-gray-300";

export function SignupForm({
  lockedRef,
}: {
  lockedRef?: { code: number; username: string } | null;
}) {
  const [state, formAction, pending] = useActionState(signUp, initialState);
  const [autoAssign, setAutoAssign] = useState(false);
  const [role, setRole] = useState<MemberRoleChoice>("cliente");
  const [accountType, setAccountType] = useState<AccountTypeChoice>("individual");
  const [taxId, setTaxId] = useState("");
  const [companyName, setCompanyName] = useState("");

  if (state.checkEmail) {
    return (
      <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 rounded-lg px-3 py-2">
        Controlla la tua email per confermare l&apos;account: appena confermi ed effettui il
        primo accesso, la registrazione si completa da sola.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* Honeypot anti-bot: campo invisibile per un utente reale (CSS, non
          display:none, per non farlo scartare dai bot più furbi); un bot che
          compila ogni campo del form ci casca, un umano non lo vede mai. */}
      <div className="absolute -left-[9999px] w-px h-px overflow-hidden" aria-hidden="true">
        <label>
          Sito web
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Nome</span>
          <input name="first_name" required className={inputClass} placeholder="Mario" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Cognome</span>
          <input name="last_name" required className={inputClass} placeholder="Rossi" />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
          placeholder="tu@esempio.it"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Password</span>
        <PasswordInput
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
          placeholder="almeno 8 caratteri"
        />
      </label>

      {lockedRef ? (
        <LockedRefField code={lockedRef.code} username={lockedRef.username} />
      ) : (
        <>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Codice di chi ti ha invitato</span>
            <input
              name="ref_code"
              type="text"
              disabled={autoAssign}
              required={!autoAssign}
              className={`${inputClass} disabled:opacity-50`}
              placeholder="es. V00008"
            />
          </label>

          <label className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              name="auto_assign"
              checked={autoAssign}
              onChange={(e) => setAutoAssign(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 dark:border-white/20 text-accent focus:ring-accent/40"
            />
            Non ho un codice ref, aiutatemi a trovare uno sponsor
          </label>
        </>
      )}

      <RegistrationRoleFields
        role={role}
        setRole={setRole}
        accountType={accountType}
        setAccountType={setAccountType}
        taxId={taxId}
        setTaxId={setTaxId}
        companyName={companyName}
        setCompanyName={setCompanyName}
        inputClass={inputClass}
        labelClass={labelClass}
      />

      <label className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
        <input
          type="checkbox"
          name="terms"
          required
          className="h-4 w-4 mt-0.5 rounded border-gray-300 dark:border-white/20 text-accent focus:ring-accent/40"
        />
        <span>
          Accetto i{" "}
          <Link href="/termini" target="_blank" className="text-accent hover:underline">
            Termini e Condizioni
          </Link>{" "}
          e la{" "}
          <Link href="/privacy" target="_blank" className="text-accent hover:underline">
            Privacy Policy
          </Link>
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {pending ? "Registrazione in corso..." : "Registrati"}
      </button>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
    </form>
  );
}
