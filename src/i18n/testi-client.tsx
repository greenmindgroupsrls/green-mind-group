"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { LOCALE, LINGUA_PREDEFINITA, type Lingua } from "./config";
import type { Dizionario } from "./dizionario";

// I componenti server leggono il dizionario con getDizionario(). Quelli
// client non possono: gira nel browser, e le funzioni che leggono cookie e
// intestazioni stanno sul server.
//
// La strada usata finora era passare i testi di proprieta' in proprieta',
// che con un pannello e una manciata di voci funzionava. Su un centinaio di
// componenti no: ogni riquadro dentro ogni scheda dentro ogni pagina
// avrebbe dovuto ricevere e ripassare lo stesso oggetto, e sarebbe bastato
// dimenticarne uno per far sparire meta' interfaccia.
//
// Il dizionario viene messo qui una volta sola, nel guscio dell'area
// riservata, e da li' in giu' lo legge chi gli serve.

type Contenuto = { testi: Dizionario; lingua: Lingua };

const Contesto = createContext<Contenuto | null>(null);

export function TestiProvider({
  testi,
  lingua,
  children,
}: {
  testi: Dizionario;
  lingua: Lingua;
  children: ReactNode;
}) {
  const valore = useMemo(() => ({ testi, lingua }), [testi, lingua]);
  return <Contesto.Provider value={valore}>{children}</Contesto.Provider>;
}

// Usare fuori dal guscio e' un errore di programmazione, non un caso da
// gestire: meglio accorgersene subito che mostrare "undefined" a un utente.
function useContenuto(): Contenuto {
  const v = useContext(Contesto);
  if (!v) {
    throw new Error("useTesti va usato dentro <TestiProvider> (vedi il layout dell'area riservata)");
  }
  return v;
}

export function useTesti(): Dizionario {
  return useContenuto().testi;
}

export function useLingua(): Lingua {
  return useContenuto().lingua;
}

// Numeri e date nella lingua scelta. Prima ogni componente scriveva
// "it-IT" a mano: un'interfaccia tradotta che mostra "7 set 2026" a un
// tedesco e' tradotta a meta'.
export function useFormato() {
  const lingua = useLingua();
  const locale = LOCALE[lingua] ?? LOCALE[LINGUA_PREDEFINITA];
  return useMemo(
    () => ({
      locale,
      euro: (v: number, decimali = 2) =>
        v.toLocaleString(locale, {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: decimali,
        }),
      numero: (v: number) => v.toLocaleString(locale),
      data: (iso: string) =>
        new Date(iso).toLocaleDateString(locale, {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
      ora: (iso: string) =>
        new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }),
    }),
    [locale],
  );
}

// Sostituisce i segnaposto tipo {n}. Gemella di riempi() in dizionario.ts,
// che pero' e' marcata "server-only" e non si puo' importare da qui.
export function riempiTesto(testo: string, valori: Record<string, string | number>): string {
  return Object.entries(valori).reduce(
    (acc, [chiave, valore]) => acc.replaceAll(`{${chiave}}`, String(valore)),
    testo,
  );
}
