"use client";

import { useEffect, useState } from "react";

// SCEGLIERE LA ZONA INVECE DI SCRIVERLA
//
// Scritti a mano, "verona" e "Verona (VR)" sono la stessa citta' per chi
// compila e due citta' diverse per chiunque legga dopo; e un CAP sbagliato
// di una cifra manda il pacco da un'altra parte senza che nessuno se ne
// accorga finche' non torna indietro.
//
// Gli elenchi arrivano da /api/comuni, gli stessi che usa il modulo di
// prenotazione del sito pubblico: una fonte sola, cosi' le due schermate non
// possono dire cose diverse. Il file completo pesa 271 KB, quindi si scarica
// prima solo regioni e province, e i comuni solo della provincia scelta.

type Comune = { n: string; c: string[] };
type Elenchi = { regioni: Record<string, string[]>; province: Record<string, string> };

export type ZonaItaliana = {
  regione: string;
  provincia: string;
  citta: string;
  cap: string;
};

export const ZONA_VUOTA: ZonaItaliana = { regione: "", provincia: "", citta: "", cap: "" };

export function ZonaItalia({
  valore,
  onChange,
  etichette,
  classeCampo,
  classeEtichetta,
}: {
  valore: ZonaItaliana;
  onChange: (z: ZonaItaliana) => void;
  etichette: { regione: string; provincia: string; citta: string; cap: string };
  classeCampo: string;
  classeEtichetta: string;
}) {
  const [elenchi, setElenchi] = useState<Elenchi | null>(null);
  // I comuni si tengono insieme alla provincia a cui appartengono: cosi' non
  // serve svuotarli quando la provincia cambia — semplicemente non
  // corrispondono piu', e si ricavano vuoti senza toccare lo stato.
  const [caricati, setCaricati] = useState<{ provincia: string; elenco: Comune[] }>({
    provincia: "",
    elenco: [],
  });

  useEffect(() => {
    let vivo = true;
    fetch("/api/comuni")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => vivo && d && setElenchi(d))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  // I comuni si ricaricano quando cambia la provincia, non a ogni tasto.
  const provincia = valore.provincia;
  useEffect(() => {
    if (!provincia) return;
    let vivo = true;
    fetch(`/api/comuni?provincia=${encodeURIComponent(provincia)}`)
      .then((r) => (r.ok ? r.json() : { comuni: [] }))
      .then((d) => vivo && setCaricati({ provincia, elenco: d.comuni ?? [] }))
      .catch(() => vivo && setCaricati({ provincia, elenco: [] }));
    return () => {
      vivo = false;
    };
  }, [provincia]);

  const comuni = caricati.provincia === provincia ? caricati.elenco : [];
  const caricando = !!provincia && caricati.provincia !== provincia;
  const provinceDellaRegione = valore.regione ? (elenchi?.regioni[valore.regione] ?? []) : [];
  const capDisponibili = comuni.find((c) => c.n === valore.citta)?.c ?? [];

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={classeEtichetta}>{etichette.regione}</span>
          <select
            required
            value={valore.regione}
            disabled={!elenchi}
            onChange={(e) =>
              // Cambiare regione azzera tutto quello che ne dipendeva:
              // lasciare una provincia di un'altra regione creerebbe un
              // indirizzo che non esiste.
              onChange({ regione: e.target.value, provincia: "", citta: "", cap: "" })
            }
            className={`${classeCampo} disabled:opacity-50`}
          >
            <option value="">{elenchi ? "—" : "…"}</option>
            {Object.keys(elenchi?.regioni ?? {})
              .sort((a, b) => a.localeCompare(b, "it"))
              .map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={classeEtichetta}>{etichette.provincia}</span>
          <select
            required
            value={valore.provincia}
            disabled={!valore.regione}
            onChange={(e) => onChange({ ...valore, provincia: e.target.value, citta: "", cap: "" })}
            className={`${classeCampo} disabled:opacity-50`}
          >
            <option value="">—</option>
            {provinceDellaRegione.map((sigla) => (
              <option key={sigla} value={sigla}>
                {elenchi?.province[sigla] ?? sigla} ({sigla})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={classeEtichetta}>{etichette.citta}</span>
          <select
            required
            value={valore.citta}
            disabled={!valore.provincia || caricando}
            onChange={(e) => {
              const scelto = comuni.find((c) => c.n === e.target.value);
              // Un comune con un CAP solo non merita una scelta: si compila
              // da se'. Gli altri restano da scegliere.
              const cap = scelto && scelto.c.length === 1 ? scelto.c[0] : "";
              onChange({ ...valore, citta: e.target.value, cap });
            }}
            className={`${classeCampo} disabled:opacity-50`}
          >
            <option value="">{caricando ? "…" : "—"}</option>
            {comuni.map((c) => (
              <option key={c.n} value={c.n}>
                {c.n}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={classeEtichetta}>{etichette.cap}</span>
          <select
            required
            value={valore.cap}
            disabled={capDisponibili.length === 0}
            onChange={(e) => onChange({ ...valore, cap: e.target.value })}
            className={`${classeCampo} disabled:opacity-50`}
          >
            <option value="">—</option>
            {capDisponibili.map((cap) => (
              <option key={cap} value={cap}>
                {cap}
              </option>
            ))}
          </select>
        </label>
      </div>
    </>
  );
}
