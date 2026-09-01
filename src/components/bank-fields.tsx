"use client";

import { useState } from "react";
import { AlertCircle, Check } from "lucide-react";
import { validaIban, validaBic, validaCoerenza, formattaIban, normalizza } from "@/lib/bank-validation";

const baseClass =
  "h-11 w-full rounded-lg border bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3.5 text-sm focus:outline-none focus:ring-2 transition-colors";
const okClass = "border-gray-300 dark:border-white/10 focus:ring-accent/40 focus:border-accent";
const erroreClass =
  "border-red-400 dark:border-red-500/60 focus:ring-red-400/40 focus:border-red-500";
const labelClass = "text-sm font-medium text-gray-700 dark:text-gray-300";

// La logica sta in un hook e non nel componente perche' i due moduli che ne
// hanno bisogno (contratto incaricato e richiesta di prelievo) hanno campi e
// disposizioni diverse: cosi' ognuno mantiene il proprio layout senza
// duplicare i controlli.
export function useBankValidation() {
  const [iban, setIban] = useState("");
  const [swift, setSwift] = useState("");
  const [toccato, setToccato] = useState({ iban: false, swift: false });

  const esitoIban = validaIban(iban);
  const esitoSwift = validaBic(swift);
  const esitoCoerenza = validaCoerenza(iban, swift);

  const visIban = toccato.iban && iban.length > 0;
  const visSwift = toccato.swift && swift.length > 0;
  const coerenzaRotta =
    toccato.iban && toccato.swift && iban.length > 0 && swift.length > 0 && !esitoCoerenza.ok;

  return {
    iban,
    swift,
    setIban,
    setSwift,
    // La verifica scatta uscendo dal campo, non a ogni tasto: segnare in
    // rosso un IBAN mentre lo si sta ancora scrivendo e' solo fastidioso.
    onIbanBlur: (valore: string) => {
      setToccato((t) => ({ ...t, iban: true }));
      // riscrittura a gruppi di 4 solo se valido, altrimenti si lascia
      // intatto quanto digitato per poterlo correggere
      if (validaIban(valore).ok && normalizza(valore)) setIban(formattaIban(valore));
    },
    onSwiftBlur: () => setToccato((t) => ({ ...t, swift: true })),
    ibanErrato: (visIban && !esitoIban.ok) || coerenzaRotta,
    swiftErrato: (visSwift && !esitoSwift.ok) || coerenzaRotta,
    ibanOk: visIban && esitoIban.ok && !coerenzaRotta,
    swiftOk: visSwift && esitoSwift.ok && !coerenzaRotta,
    erroreIban: visIban && !esitoIban.ok ? esitoIban.errore : null,
    erroreSwift: visSwift && !esitoSwift.ok ? esitoSwift.errore : null,
    erroreCoerenza: coerenzaRotta && !esitoCoerenza.ok ? esitoCoerenza.errore : null,
    classe: (errato: boolean) => `${baseClass} ${errato ? erroreClass : okClass}`,
  };
}

export function MessaggioErrore({ testo }: { testo: string }) {
  return (
    <span className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
      <AlertCircle size={13} className="mt-0.5 shrink-0" />
      {testo}
    </span>
  );
}

export function MessaggioOk({ testo }: { testo: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
      <Check size={13} /> {testo}
    </span>
  );
}

export function AvvisoCoerenza({ testo }: { testo: string }) {
  return (
    <p className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-400">
      <AlertCircle size={14} className="mt-0.5 shrink-0" />
      {testo}
    </p>
  );
}

// Blocco completo usato nel contratto incaricato (banca, intestatario,
// IBAN, Swift), tutti facoltativi.
export function BankFields() {
  const v = useBankValidation();

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Banca</span>
          <input name="bank_name" className={v.classe(false)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Intestatario</span>
          <input name="bank_holder" className={v.classe(false)} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>IBAN</span>
          <input
            name="iban"
            value={v.iban}
            onChange={(e) => v.setIban(e.target.value)}
            onBlur={(e) => v.onIbanBlur(e.target.value)}
            placeholder="IT60 X054 2811 1010 0000 0123 456"
            aria-invalid={v.ibanErrato}
            className={v.classe(v.ibanErrato)}
          />
          {v.erroreIban && <MessaggioErrore testo={v.erroreIban} />}
          {v.ibanOk && <MessaggioOk testo="IBAN valido" />}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Swift / BIC</span>
          <input
            name="swift"
            value={v.swift}
            onChange={(e) => v.setSwift(e.target.value.toUpperCase())}
            onBlur={v.onSwiftBlur}
            placeholder="es. BCITITMM"
            aria-invalid={v.swiftErrato}
            className={v.classe(v.swiftErrato)}
          />
          {v.erroreSwift && <MessaggioErrore testo={v.erroreSwift} />}
          {v.swiftOk && <MessaggioOk testo="Swift valido" />}
        </label>
      </div>

      {v.erroreCoerenza && <AvvisoCoerenza testo={v.erroreCoerenza} />}
    </>
  );
}
