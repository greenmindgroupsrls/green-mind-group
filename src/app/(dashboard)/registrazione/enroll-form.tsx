"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { enrollMemberWithSale, type EnrollState } from "./enroll-actions";
import { EUROPEAN_COUNTRIES, flagEmoji } from "@/lib/countries";
import { formatActivityCode } from "@/lib/activity-code";
import { PasswordInput } from "@/components/password-input";
import { ProductPicker } from "@/components/product-picker";
import type { Product } from "@/lib/products";

const initialState: EnrollState = { error: null, success: null };

const LEVEL_LABEL: Record<number, string> = {
  0: "Tua commissione",
  1: "Livello 1",
  2: "Livello 2",
  3: "Livello 3",
};

const inputClass =
  "h-11 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent";
const labelClass = "text-sm font-medium text-gray-700 dark:text-gray-300";

export function EnrollForm({ products }: { products: Product[] }) {
  const [state, formAction, pending] = useActionState(enrollMemberWithSale, initialState);
  const [accountType, setAccountType] = useState<"individual" | "company">("individual");
  const [role, setRole] = useState<"cliente" | "incaricato">("cliente");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-6">
      <form ref={formRef} action={formAction} className="flex flex-col gap-5">
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>Tipo di iscrizione</span>
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 p-1 self-start">
              <button
                type="button"
                onClick={() => setRole("cliente")}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  role === "cliente"
                    ? "bg-accent text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
                }`}
              >
                Cliente
              </button>
              <button
                type="button"
                onClick={() => setRole("incaricato")}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  role === "incaricato"
                    ? "bg-accent text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
                }`}
              >
                Incaricato
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>Tipo di account</span>
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 p-1 self-start">
              <button
                type="button"
                onClick={() => setAccountType("individual")}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  accountType === "individual"
                    ? "bg-accent text-white shadow-sm"
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
                    ? "bg-accent text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
                }`}
              >
                Azienda
              </button>
            </div>
          </div>
        </div>
        <input type="hidden" name="role" value={role} />

        <ProductPicker products={products} className={inputClass} labelClassName={labelClass} />
        <input type="hidden" name="account_type" value={accountType} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Nome *</span>
            <input name="first_name" required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Cognome *</span>
            <input name="last_name" required className={inputClass} />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Email *</span>
            <input
              name="email"
              type="email"
              required
              className={inputClass}
              placeholder="usata per accesso e comunicazioni"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Paese *</span>
            <select name="country" required defaultValue="Italia" className={inputClass}>
              {EUROPEAN_COUNTRIES.map((c) => (
                <option key={c.iso2} value={c.name}>
                  {flagEmoji(c.iso2)} {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Password *</span>
            <PasswordInput
              name="password"
              required
              minLength={8}
              className={inputClass}
              placeholder="almeno 8 caratteri"
            />
          </label>
          {accountType === "company" ? (
            <>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Ragione sociale *</span>
                <input name="company_name" required className={inputClass} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Partita IVA</span>
                <input name="tax_id" className={inputClass} />
              </label>
            </>
          ) : (
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Codice Fiscale *</span>
              <input name="tax_id" required className={inputClass} />
            </label>
          )}
        </div>

        <div className="flex flex-col gap-3">
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
          {accountType === "company" && (
            <label className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                name="is_national_vat_id"
                className="h-4 w-4 rounded border-gray-300 dark:border-white/20 text-accent focus:ring-accent/40"
              />
              Partita IVA nazionale
            </label>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => formRef.current?.reset()}
            className="rounded-lg border border-gray-300 dark:border-white/10 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
          >
            Pulisci
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {pending ? "Iscrizione in corso..." : "Iscrivi e registra vendita"}
          </button>
        </div>

        {state.error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
            {state.error}
          </p>
        )}
      </form>

      {state.success && (
        <div className="rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="px-4 py-2.5 bg-green-50 dark:bg-green-500/10 text-sm font-medium text-green-700 dark:text-green-400">
            Iscritto {state.success.username} — codice attività{" "}
            {formatActivityCode(state.success.activity_code)}
          </div>
          {state.success.entries.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-white/10">
                  <th className="px-4 py-2 font-medium">Livello</th>
                  <th className="px-4 py-2 font-medium text-right">Importo</th>
                </tr>
              </thead>
              <tbody>
                {state.success.entries.map((entry) => (
                  <tr
                    key={`${entry.beneficiary_code}-${entry.level}`}
                    className="border-b border-gray-100 dark:border-white/5 last:border-0"
                  >
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">
                      {LEVEL_LABEL[entry.level] ?? entry.level}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900 dark:text-white">
                      {entry.amount.toLocaleString("it-IT", { style: "currency", currency: "EUR" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
