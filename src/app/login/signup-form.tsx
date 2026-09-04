"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { Dizionario } from "@/i18n/dizionario";
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
  "glass-input px-3.5 py-2.5 text-sm";
const labelClass = "text-sm font-medium text-gray-700 dark:text-gray-300";

export function SignupForm({
  lockedRef,
  t,
}: {
  lockedRef?: { code: number; username: string } | null;
  t: Dizionario["accesso"];
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
        {t.controllaEmail}
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
          <span className={labelClass}>{t.nome}</span>
          <input name="first_name" required className={inputClass} placeholder={t.nomeSegnaposto} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>{t.cognome}</span>
          <input name="last_name" required className={inputClass} placeholder={t.cognomeSegnaposto} />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>{t.email}</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
          placeholder={t.emailSegnaposto}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>{t.password}</span>
        <PasswordInput
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
          placeholder={t.passwordMinima}
        />
      </label>

      {lockedRef ? (
        <LockedRefField code={lockedRef.code} username={lockedRef.username} />
      ) : (
        <>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{t.codiceInvito}</span>
            <input
              name="ref_code"
              type="text"
              disabled={autoAssign}
              required={!autoAssign}
              className={`${inputClass} disabled:opacity-50`}
              placeholder={t.codiceInvitoSegnaposto}
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
            {t.nessunCodice}
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
          {t.accettoI}{" "}
          <Link href="/termini" target="_blank" className="text-accent hover:underline">
            {t.terminiCondizioni}
          </Link>{" "}
          {t.eLa}{" "}
          <Link href="/privacy" target="_blank" className="text-accent hover:underline">
            {t.privacyPolicy}
          </Link>
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="glass-btn-primary rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? t.registrazioneInCorso : t.registrati}
      </button>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
    </form>
  );
}
