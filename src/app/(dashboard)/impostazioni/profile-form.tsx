"use client";

import { useActionState, useState } from "react";
import { updateProfile, type ProfileState } from "./actions";
import { EUROPEAN_COUNTRIES, flagEmoji } from "@/lib/countries";
import { PersonalLinkField } from "@/components/personal-link-field";

const initialState: ProfileState = { error: null, success: false };

const inputClass =
  "h-11 glass-input px-3.5 text-sm";
const readOnlyClass =
  "h-11 flex items-center rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 px-3.5 text-sm";
const labelClass = "text-sm font-medium text-gray-700 dark:text-gray-300";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF"];
const TIMEZONES = [
  "Europe/Rome",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "America/New_York",
  "UTC",
];

type ProfileValues = {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  accountType: string;
  country: string;
  dateOfBirth: string;
  phoneCountryCode: string;
  phoneNumber: string;
  personalDomain: string;
  taxId: string;
  companyName: string;
  sdiCode: string;
  currency: string;
  timezone: string;
};

export function ProfileForm({ initial }: { initial: ProfileValues }) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);
  const [accountType, setAccountType] = useState(initial.accountType || "individual");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="inline-flex rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-1 self-start">
        <button
          type="button"
          onClick={() => setAccountType("individual")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            accountType === "individual"
              ? "bg-accent text-[var(--accent-fg)] shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
          }`}
        >
          Privato
        </button>
        <button
          type="button"
          onClick={() => setAccountType("company")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            accountType === "company"
              ? "bg-accent text-[var(--accent-fg)] shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
          }`}
        >
          Azienda
        </button>
      </div>
      <input type="hidden" name="account_type" value={accountType} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Username</span>
          <p className={readOnlyClass}>{initial.username}</p>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Email</span>
          <p className={readOnlyClass}>{initial.email}</p>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Nome</span>
          <input name="first_name" required defaultValue={initial.firstName} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Cognome</span>
          <input name="last_name" required defaultValue={initial.lastName} className={inputClass} />
        </label>

        {accountType === "company" && (
          <label className="flex flex-col gap-1.5 col-span-2">
            <span className={labelClass}>Ragione sociale</span>
            <input
              name="company_name"
              required
              defaultValue={initial.companyName}
              className={inputClass}
              placeholder="Nome dell'azienda"
            />
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Paese</span>
          <select
            name="country"
            defaultValue={initial.country || "Italia"}
            className={inputClass}
          >
            {EUROPEAN_COUNTRIES.map((c) => (
              <option key={c.iso2} value={c.name}>
                {flagEmoji(c.iso2)} {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Data di nascita</span>
          <input
            name="date_of_birth"
            type="date"
            defaultValue={initial.dateOfBirth}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Telefono</span>
          <div className="flex gap-2">
            <select
              name="phone_country_code"
              defaultValue={initial.phoneCountryCode || "+39"}
              className={`${inputClass} w-[104px] shrink-0`}
            >
              {EUROPEAN_COUNTRIES.map((c) => (
                <option key={c.iso2} value={c.dialCode}>
                  {flagEmoji(c.iso2)} {c.dialCode}
                </option>
              ))}
            </select>
            <input
              name="phone_number"
              defaultValue={initial.phoneNumber}
              className={`${inputClass} flex-1`}
            />
          </div>
        </label>
        <PersonalLinkField slug={initial.personalDomain} />

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>{accountType === "company" ? "Partita IVA" : "Codice fiscale"}</span>
          <input name="tax_id" defaultValue={initial.taxId} className={inputClass} />
        </label>
        {accountType === "company" && (
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Codice Univoco</span>
            <input
              name="sdi_code"
              defaultValue={initial.sdiCode}
              className={inputClass}
              placeholder="Codice destinatario SDI"
            />
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Fuso orario</span>
          <select
            name="timezone"
            defaultValue={initial.timezone || "Europe/Rome"}
            className={inputClass}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Valuta</span>
          <select name="currency" defaultValue={initial.currency || "EUR"} className={inputClass}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="self-start glass-btn-primary rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {pending ? "Salvataggio..." : "Salva profilo"}
      </button>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 rounded-lg px-3 py-2">
          Profilo aggiornato.
        </p>
      )}
    </form>
  );
}
