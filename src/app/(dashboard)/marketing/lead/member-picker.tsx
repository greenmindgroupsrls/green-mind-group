"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

export type MemberOption = { activity_code: number; username: string };

// Confronto tollerante: ignora maiuscole e accenti, cosi' "nicolo" trova
// anche "Nicolo'".
function normalizza(testo: string) {
  return testo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const ALTEZZA_TENDINA = 240;

// La tendina non puo' vivere dentro la cella: la tabella scorre in
// orizzontale e la ritaglierebbe. Va quindi in un portale ancorato al
// riquadro del campo, riposizionato quando la pagina scorre.
// Riceve il ref e non l'elemento: letto al momento della misura, e' gia'
// montato anche alla primissima apertura.
function usePosizione(campo: RefObject<HTMLElement | null>, aperto: boolean) {
  const [riquadro, setRiquadro] = useState<{ left: number; top: number; width: number } | null>(null);

  const misura = useCallback(() => {
    const elemento = campo.current;
    if (!elemento) return;
    const r = elemento.getBoundingClientRect();
    const larghezza = Math.max(r.width, 220);
    const spazioSotto = window.innerHeight - r.bottom;
    const sopra = spazioSotto < ALTEZZA_TENDINA && r.top > spazioSotto;
    setRiquadro({
      left: Math.max(8, Math.min(r.left, window.innerWidth - larghezza - 8)),
      top: sopra ? r.top - Math.min(ALTEZZA_TENDINA, r.top - 8) - 4 : r.bottom + 4,
      width: larghezza,
    });
  }, [campo]);

  // La prima misura la prende chi apre la tendina: qui restano solo gli
  // aggiornamenti dovuti a scorrimento e ridimensionamento.
  useEffect(() => {
    if (!aperto) return;
    window.addEventListener("scroll", misura, true);
    window.addEventListener("resize", misura);
    return () => {
      window.removeEventListener("scroll", misura, true);
      window.removeEventListener("resize", misura);
    };
  }, [aperto, misura]);

  return { riquadro, misura };
}

export function MemberPicker({
  members,
  value,
  onChange,
  disabled = false,
  placeholder,
}: {
  members: MemberOption[];
  value: number | null;
  onChange: (codice: number | null) => void;
  disabled?: boolean;
  placeholder: string;
}) {
  const idLista = useId();
  const [aperto, setAperto] = useState(false);
  const [testo, setTesto] = useState("");
  const [evidenziato, setEvidenziato] = useState(0);
  const campoRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listaRef = useRef<HTMLUListElement | null>(null);

  const scelto = useMemo(
    () => (value === null ? null : (members.find((m) => m.activity_code === value) ?? null)),
    [members, value],
  );

  // Il testo digitato filtra solo se e' diverso dal nome gia' scelto:
  // riaprendo la tendina si rivede tutto l'elenco, come da menu classico.
  const filtrati = useMemo(() => {
    const q = normalizza(testo.trim());
    if (!q || (scelto && normalizza(scelto.username) === q)) return members;
    return members.filter(
      (m) => normalizza(m.username).includes(q) || String(m.activity_code).includes(q),
    );
  }, [members, testo, scelto]);

  const { riquadro: posizione, misura } = usePosizione(campoRef, aperto);

  useEffect(() => {
    if (!aperto) return;
    function fuori(e: PointerEvent) {
      const bersaglio = e.target as Node;
      if (campoRef.current?.contains(bersaglio)) return;
      if (listaRef.current?.contains(bersaglio)) return;
      chiudi();
    }
    document.addEventListener("pointerdown", fuori);
    return () => document.removeEventListener("pointerdown", fuori);
  });

  useEffect(() => {
    if (!aperto || !listaRef.current) return;
    const voce = listaRef.current.children[evidenziato] as HTMLElement | undefined;
    voce?.scrollIntoView({ block: "nearest" });
  }, [aperto, evidenziato]);

  function apri() {
    if (disabled) return;
    misura();
    setAperto(true);
    setEvidenziato(Math.max(0, filtrati.findIndex((m) => m.activity_code === value)));
  }

  function chiudi() {
    setAperto(false);
    setTesto(scelto ? scelto.username : "");
  }

  function seleziona(m: MemberOption) {
    onChange(m.activity_code);
    setTesto(m.username);
    setAperto(false);
    inputRef.current?.focus();
  }

  function tasto(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!aperto) {
        apri();
        return;
      }
      if (filtrati.length === 0) return;
      const passo = e.key === "ArrowDown" ? 1 : -1;
      setEvidenziato((i) => (i + passo + filtrati.length) % filtrati.length);
      return;
    }
    if (e.key === "Enter") {
      if (aperto && filtrati[evidenziato]) {
        e.preventDefault();
        seleziona(filtrati[evidenziato]);
      }
      return;
    }
    if (e.key === "Escape" && aperto) {
      e.preventDefault();
      chiudi();
    }
  }

  const tendina =
    aperto && posizione
      ? createPortal(
          <ul
            ref={listaRef}
            id={idLista}
            role="listbox"
            style={{
              position: "fixed",
              left: posizione.left,
              top: posizione.top,
              width: posizione.width,
              maxHeight: ALTEZZA_TENDINA,
            }}
            className="z-[60] overflow-y-auto glass-card glass-menu rounded-lg py-1"
          >
            {filtrati.length === 0 && (
              <li className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                Nessun incaricato trovato
              </li>
            )}
            {filtrati.map((m, i) => {
              const attivo = i === evidenziato;
              return (
                <li
                  key={m.activity_code}
                  role="option"
                  aria-selected={m.activity_code === value}
                  onPointerEnter={() => setEvidenziato(i)}
                  // Senza questo il click toglie il fuoco al campo, che al
                  // rientro riaprirebbe subito la tendina appena chiusa.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => seleziona(m)}
                  className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-xs ${
                    attivo
                      ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <span className="truncate">{m.username}</span>
                  <span className={attivo ? "opacity-70" : "text-gray-600 dark:text-gray-400"}>
                    #{m.activity_code}
                  </span>
                </li>
              );
            })}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div ref={campoRef} className="relative flex-1 min-w-0">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={aperto}
        aria-controls={idLista}
        aria-autocomplete="list"
        autoComplete="off"
        value={testo}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          setTesto(e.target.value);
          setEvidenziato(0);
          if (!aperto) setAperto(true);
          if (value !== null) onChange(null);
        }}
        onFocus={apri}
        onKeyDown={tasto}
        className="w-full text-xs glass-input rounded-md text-gray-700 dark:text-gray-300 pl-2 pr-6 py-1 disabled:opacity-50"
      />
      <ChevronDown
        size={13}
        aria-hidden="true"
        className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"
      />
      {tendina}
    </div>
  );
}
