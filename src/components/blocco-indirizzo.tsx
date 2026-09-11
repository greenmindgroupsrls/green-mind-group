"use client";

import { useState } from "react";
import { EUROPEAN_COUNTRIES, flagEmoji } from "@/lib/countries";
import { StreetAutocompleteInput, type AddressSuggestion } from "./street-autocomplete-input";
import { ZonaItalia, ZONA_VUOTA, type ZonaItaliana } from "./zona-italia";

// UN INDIRIZZO, DUE POSTI DOVE SERVE
//
// Fatturazione e spedizione chiedono le stesse identiche cose. Tenerne due
// copie nel modulo significa che la prossima correzione si fa in un posto
// solo e l'altro resta indietro — di solito quello che si guarda di meno.
//
// I nomi dei campi si distinguono col prefisso, cosi' lo stesso blocco
// puo' comparire due volte nello stesso form senza sovrapporsi.

export type DatiIndirizzo = {
  paese: string;
  via: string;
  citta: string;
  provincia: string;
  cap: string;
};

export const INDIRIZZO_VUOTO: DatiIndirizzo = {
  paese: "Italia",
  via: "",
  citta: "",
  provincia: "",
  cap: "",
};

export function BloccoIndirizzo({
  prefisso,
  valore,
  onChange,
  etichette,
  classeCampo,
  classeEtichetta,
  obbligatorio = true,
}: {
  // "" per la spedizione (i nomi storici: street, city…), "billing_" per la
  // fatturazione.
  prefisso: string;
  valore: DatiIndirizzo;
  onChange: (v: DatiIndirizzo) => void;
  etichette: {
    paese: string;
    indirizzo: string;
    citta: string;
    cap: string;
    provincia: string;
    regione: string;
  };
  classeCampo: string;
  classeEtichetta: string;
  obbligatorio?: boolean;
}) {
  const [zona, setZona] = useState<ZonaItaliana>(ZONA_VUOTA);
  const inItalia = valore.paese === "Italia";
  const iso2 = EUROPEAN_COUNTRIES.find((c) => c.name === valore.paese)?.iso2;

  function aggiornaZona(z: ZonaItaliana) {
    setZona(z);
    onChange({ ...valore, citta: z.citta, provincia: z.provincia, cap: z.cap });
  }

  function daSuggerimento(s: AddressSuggestion) {
    const paese = EUROPEAN_COUNTRIES.find((c) => c.iso2 === s.countryIso2)?.name;
    onChange({
      ...valore,
      via: s.street || valore.via,
      citta: s.city || valore.citta,
      provincia: s.region || valore.provincia,
      cap: s.postalCode || valore.cap,
      paese: paese ?? valore.paese,
    });
  }

  return (
    <>
      <label className="flex flex-col gap-1.5">
        <span className={classeEtichetta}>{etichette.paese}</span>
        <select
          name={`${prefisso}country`}
          required={obbligatorio}
          value={valore.paese}
          onChange={(e) => {
            // Cambiando paese la zona italiana non vale piu': si riparte
            // puliti, altrimenti resterebbe un CAP di un altro stato
            // attaccato a una citta' nuova.
            setZona(ZONA_VUOTA);
            onChange({ ...valore, paese: e.target.value, citta: "", provincia: "", cap: "" });
          }}
          className={classeCampo}
        >
          {EUROPEAN_COUNTRIES.map((c) => (
            <option key={c.iso2} value={c.name}>
              {flagEmoji(c.iso2)} {c.name}
            </option>
          ))}
        </select>
      </label>

      {inItalia ? (
        <>
          <ZonaItalia
            valore={zona}
            onChange={aggiornaZona}
            etichette={{
              regione: `${etichette.regione} *`,
              provincia: `${etichette.provincia} *`,
              citta: etichette.citta,
              cap: etichette.cap,
            }}
            classeCampo={classeCampo}
            classeEtichetta={classeEtichetta}
          />
          <input type="hidden" name={`${prefisso}city`} value={valore.citta} />
          <input type="hidden" name={`${prefisso}postal_code`} value={valore.cap} />
          <input type="hidden" name={`${prefisso}region`} value={valore.provincia} />
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className={classeEtichetta}>{etichette.citta}</span>
              <input
                name={`${prefisso}city`}
                required={obbligatorio}
                value={valore.citta}
                onChange={(e) => onChange({ ...valore, citta: e.target.value })}
                className={classeCampo}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={classeEtichetta}>{etichette.cap}</span>
              <input
                name={`${prefisso}postal_code`}
                required={obbligatorio}
                value={valore.cap}
                onChange={(e) => onChange({ ...valore, cap: e.target.value })}
                className={classeCampo}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className={classeEtichetta}>{etichette.provincia}</span>
            <input
              name={`${prefisso}region`}
              value={valore.provincia}
              onChange={(e) => onChange({ ...valore, provincia: e.target.value })}
              className={classeCampo}
            />
          </label>
        </>
      )}

      {/* La via per ultima: si dice prima dove, poi l'indirizzo esatto. */}
      <StreetAutocompleteInput
        name={`${prefisso}street`}
        label={etichette.indirizzo}
        value={valore.via}
        onChange={(v) => onChange({ ...valore, via: v })}
        onSelect={daSuggerimento}
        countryIso2={iso2}
        className={classeCampo}
        required={obbligatorio}
      />
    </>
  );
}
