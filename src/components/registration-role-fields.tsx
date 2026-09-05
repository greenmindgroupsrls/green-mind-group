"use client";

import type { Dispatch, SetStateAction } from "react";

export type MemberRoleChoice = "cliente" | "incaricato";
export type AccountTypeChoice = "individual" | "company";

const toggleBtnBase = "rounded-md px-4 py-2 text-sm font-medium transition-colors";
const toggleBtnActive = "bg-[var(--accent)] text-[var(--accent-fg)] shadow-sm";
const toggleBtnInactive = "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white";
const toggleWrapClass =
  "inline-flex rounded-lg border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 p-1 self-start";

// Riusato in ogni punto di registrazione (autoregistrazione, completamento
// Google/email, iscrizione da back office da parte di uno sponsor): sceglie
// se la persona è Cliente (resta nell'albero ma non guadagna, back office
// ridotto) o Incaricato (membro a tutti gli effetti), e se Privato o
// Azienda — con Codice Fiscale o Ragione sociale/Partita IVA richiesti già
// qui, non solo dopo in Impostazioni.
export function RegistrationRoleFields({
  role,
  setRole,
  accountType,
  setAccountType,
  taxId,
  setTaxId,
  companyName,
  setCompanyName,
  inputClass,
  labelClass,
}: {
  role: MemberRoleChoice;
  setRole: Dispatch<SetStateAction<MemberRoleChoice>>;
  accountType: AccountTypeChoice;
  setAccountType: Dispatch<SetStateAction<AccountTypeChoice>>;
  taxId: string;
  setTaxId: Dispatch<SetStateAction<string>>;
  companyName: string;
  setCompanyName: Dispatch<SetStateAction<string>>;
  inputClass: string;
  labelClass: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Tipo di iscrizione</span>
          <div className={toggleWrapClass}>
            <button
              type="button"
              onClick={() => setRole("cliente")}
              className={`${toggleBtnBase} ${role === "cliente" ? toggleBtnActive : toggleBtnInactive}`}
            >
              Cliente
            </button>
            <button
              type="button"
              onClick={() => setRole("incaricato")}
              className={`${toggleBtnBase} ${role === "incaricato" ? toggleBtnActive : toggleBtnInactive}`}
            >
              Incaricato
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Tipo di account</span>
          <div className={toggleWrapClass}>
            <button
              type="button"
              onClick={() => setAccountType("individual")}
              className={`${toggleBtnBase} ${accountType === "individual" ? toggleBtnActive : toggleBtnInactive}`}
            >
              Privato
            </button>
            <button
              type="button"
              onClick={() => setAccountType("company")}
              className={`${toggleBtnBase} ${accountType === "company" ? toggleBtnActive : toggleBtnInactive}`}
            >
              Azienda
            </button>
          </div>
        </div>
      </div>
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="account_type" value={accountType} />

      {accountType === "individual" ? (
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Codice Fiscale *</span>
          <input
            name="tax_id"
            required
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
            className={inputClass}
          />
        </label>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Ragione sociale *</span>
            <input
              name="company_name"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Partita IVA</span>
            <input
              name="tax_id"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
      )}
    </div>
  );
}
