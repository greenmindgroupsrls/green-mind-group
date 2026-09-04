"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { completeRegistration, type CompleteRegistrationState } from "./actions";
import { LockedRefField } from "@/components/locked-ref-field";
import { formatActivityCode } from "@/lib/activity-code";
import {
  RegistrationRoleFields,
  type MemberRoleChoice,
  type AccountTypeChoice,
} from "@/components/registration-role-fields";

const initialState: CompleteRegistrationState = { error: null };

const inputClass =
  "glass-input px-3.5 py-2.5 text-sm";
const labelClass = "text-sm font-medium text-gray-700 dark:text-gray-300";

export function CompleteForm({
  initialFirstName,
  initialLastName,
  initialRefCode,
  initialAutoAssign,
  initialRole,
  initialAccountType,
  initialTaxId,
  initialCompanyName,
  lockedRef,
}: {
  initialFirstName: string;
  initialLastName: string;
  initialRefCode: number | null;
  initialAutoAssign: boolean;
  initialRole: MemberRoleChoice;
  initialAccountType: AccountTypeChoice;
  initialTaxId: string;
  initialCompanyName: string;
  lockedRef?: { code: number; username: string } | null;
}) {
  const [state, formAction, pending] = useActionState(completeRegistration, initialState);
  const [autoAssign, setAutoAssign] = useState(initialAutoAssign);
  const [role, setRole] = useState<MemberRoleChoice>(initialRole);
  const [accountType, setAccountType] = useState<AccountTypeChoice>(initialAccountType);
  const [taxId, setTaxId] = useState(initialTaxId);
  const [companyName, setCompanyName] = useState(initialCompanyName);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Nome</span>
          <input
            name="first_name"
            required
            defaultValue={initialFirstName}
            className={inputClass}
            placeholder="Mario"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Cognome</span>
          <input
            name="last_name"
            required
            defaultValue={initialLastName}
            className={inputClass}
            placeholder="Rossi"
          />
        </label>
      </div>

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
              defaultValue={initialRefCode !== null ? formatActivityCode(initialRefCode) : undefined}
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
        className="glass-btn-primary rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {pending ? "Completamento in corso..." : "Entra nella rete"}
      </button>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
    </form>
  );
}
