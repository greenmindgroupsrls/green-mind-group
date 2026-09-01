"use client";

import { useEffect, useRef, useState } from "react";

export type AddressSuggestion = {
  displayName: string;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  countryIso2: string | null;
};

// Campo "Indirizzo" con suggerimenti in tempo reale (OpenStreetMap /
// Nominatim, via la nostra route proxy). Input controllato: il valore vive
// nel form padre (che possiede anche città/CAP/paese), qui gestiamo solo
// testo digitato + dropdown + debounce.
export function StreetAutocompleteInput({
  name,
  label,
  value,
  onChange,
  onSelect,
  countryIso2,
  className,
  required,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  countryIso2?: string;
  className: string;
  required?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleChange(v: string) {
    onChange(v);
    setOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length < 4) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const params = new URLSearchParams({ q: v });
      if (countryIso2) params.set("country", countryIso2);
      try {
        const res = await fetch(`/api/geocode/address-search?${params.toString()}`);
        const data = await res.json();
        setSuggestions(data.results ?? []);
      } catch {
        setSuggestions([]);
      }
    }, 450);
  }

  function handleSelect(s: AddressSuggestion) {
    onSelect(s);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <label className="flex flex-col gap-1.5 relative">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <input
        name={name}
        required={required}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={className}
        placeholder="Inizia a digitare via e numero civico"
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1c1836] shadow-lg">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={() => handleSelect(s)}
                className="w-full text-left px-3.5 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
              >
                {s.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-gray-400 dark:text-gray-500">
        Suggerimenti indirizzo &copy; OpenStreetMap contributors
      </p>
    </label>
  );
}
