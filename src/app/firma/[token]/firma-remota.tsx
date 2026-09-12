"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Mail, PenLine } from "lucide-react";
import { FirmaPad } from "@/components/firma-pad";
import { firmaConCodice, richiediCodice } from "./actions";
import { MINUTI_VALIDITA_CODICE } from "@/lib/documenti";

// Tre passi, uno alla volta: chiedo il codice, lo inserisco, firmo. Su un
// telefono tenerli tutti a schermo insieme vuol dire non capire dove si e'
// arrivati.

export function FirmaRemota({
  token,
  documento,
  numero,
  nomeSuggerito,
  emailOffuscata,
}: {
  token: string;
  documento: string;
  numero: string;
  nomeSuggerito: string;
  emailOffuscata: string;
}) {
  const [inCorso, avvia] = useTransition();
  const [errore, setErrore] = useState<string | null>(null);
  const [codiceInviato, setCodiceInviato] = useState(false);
  const [codice, setCodice] = useState("");
  const [nome, setNome] = useState(nomeSuggerito);
  const [padAperto, setPadAperto] = useState(false);
  const [fatto, setFatto] = useState(false);

  const chiediCodice = () => {
    setErrore(null);
    avvia(async () => {
      const esito = await richiediCodice(token);
      if (esito.error) {
        setErrore(esito.error);
        return;
      }
      setCodiceInviato(true);
    });
  };

  const firma = (png: string) => {
    setErrore(null);
    avvia(async () => {
      const esito = await firmaConCodice(token, codice, nome, png);
      if (esito.error) {
        setErrore(esito.error);
        return;
      }
      setPadAperto(false);
      setFatto(true);
    });
  };

  if (fatto) {
    return (
      <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 p-6 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
          <Check size={24} />
        </span>
        <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-300 mt-3">
          Firma registrata
        </h2>
        <p className="text-sm text-emerald-800 dark:text-emerald-400 mt-1">
          Grazie. Riceverai la copia firmata di {documento} ({numero}) via email appena l&apos;incaricato
          chiude il documento.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!codiceInviato ? (
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 p-5 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <span className="shrink-0 h-10 w-10 rounded-lg bg-accent/10 text-accent inline-flex items-center justify-center">
              <Mail size={18} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Prima di firmare, confermiamo che sei tu
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Ti mandiamo un codice a {emailOffuscata}. Vale {MINUTI_VALIDITA_CODICE} minuti.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={chiediCodice}
            disabled={inCorso}
            className="self-start inline-flex items-center justify-center gap-2 px-5 h-11 rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] text-sm font-semibold disabled:opacity-50"
          >
            {inCorso && <Loader2 size={16} className="animate-spin" />}
            Inviami il codice
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 p-5 flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Inserisci il codice ricevuto
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              L&apos;abbiamo mandato a {emailOffuscata}.
            </p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Codice</span>
            <input
              value={codice}
              onChange={(e) => setCodice(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className="h-12 w-full glass-input px-3.5 text-lg tracking-[0.3em] font-semibold"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Nome e cognome di chi firma
            </span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="h-11 w-full glass-input px-3.5 text-sm"
            />
          </label>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => {
                setErrore(null);
                setPadAperto(true);
              }}
              disabled={inCorso || codice.length !== 6 || !nome.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 h-11 rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] text-sm font-semibold disabled:opacity-40"
            >
              <PenLine size={16} />
              Firma il documento
            </button>
            <button
              type="button"
              onClick={chiediCodice}
              disabled={inCorso}
              className="inline-flex items-center justify-center gap-2 px-4 h-11 rounded-lg glass-btn-soft text-sm font-medium text-gray-700 dark:text-gray-200 disabled:opacity-50"
            >
              Invia di nuovo il codice
            </button>
          </div>
        </div>
      )}

      {errore && (
        <p className="rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-sm px-4 py-2.5">
          {errore}
        </p>
      )}

      {padAperto && (
        <FirmaPad
          titolo="La tua firma"
          sottotitolo={`${documento} · ${numero}`}
          inCorso={inCorso}
          onChiudi={() => setPadAperto(false)}
          onFirma={firma}
        />
      )}
    </div>
  );
}
