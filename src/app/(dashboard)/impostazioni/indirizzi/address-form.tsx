"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { addAddress, type AddressState } from "./actions";
import { StreetAutocompleteInput, type AddressSuggestion } from "@/components/street-autocomplete-input";
import { EUROPEAN_COUNTRIES, flagEmoji } from "@/lib/countries";

const initialState: AddressState = { error: null };

const inputClass =
  "rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent";
const labelClass = "text-sm font-medium text-gray-700 dark:text-gray-300";

const emptyAddress = { street: "", city: "", region: "", postalCode: "", country: "Italia" };

export function AddressForm() {
  const [state, formAction, pending] = useActionState(addAddress, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [address, setAddress] = useState(emptyAddress);
  const [prevPending, setPrevPending] = useState(pending);

  useEffect(() => {
    if (!pending && !state.error) formRef.current?.reset();
  }, [pending, state.error]);

  if (pending !== prevPending) {
    setPrevPending(pending);
    if (!pending && !state.error) setAddress(emptyAddress);
  }

  const selectedIso2 = EUROPEAN_COUNTRIES.find((c) => c.name === address.country)?.iso2;

  function handleSelectSuggestion(s: AddressSuggestion) {
    const matchedCountry = EUROPEAN_COUNTRIES.find((c) => c.iso2 === s.countryIso2)?.name;
    setAddress((prev) => ({
      street: s.street || prev.street,
      city: s.city || prev.city,
      region: s.region || prev.region,
      postalCode: s.postalCode || prev.postalCode,
      country: matchedCountry ?? prev.country,
    }));
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Nome destinatario</span>
          <input name="recipient_name" required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Tipo</span>
          <select name="type" defaultValue="shipping" className={inputClass}>
            <option value="shipping">Shipping</option>
            <option value="billing">Billing</option>
          </select>
        </label>

        <div className="col-span-2">
          <StreetAutocompleteInput
            name="street"
            label="Indirizzo"
            value={address.street}
            onChange={(v) => setAddress((prev) => ({ ...prev, street: v }))}
            onSelect={handleSelectSuggestion}
            countryIso2={selectedIso2}
            className={inputClass}
            required
          />
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Città</span>
          <input
            name="city"
            required
            value={address.city}
            onChange={(e) => setAddress((prev) => ({ ...prev, city: e.target.value }))}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Regione</span>
          <input
            name="region"
            value={address.region}
            onChange={(e) => setAddress((prev) => ({ ...prev, region: e.target.value }))}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Paese</span>
          <select
            name="country"
            required
            value={address.country}
            onChange={(e) => setAddress((prev) => ({ ...prev, country: e.target.value }))}
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
          <span className={labelClass}>CAP</span>
          <input
            name="postal_code"
            required
            value={address.postalCode}
            onChange={(e) => setAddress((prev) => ({ ...prev, postalCode: e.target.value }))}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5 col-span-2">
          <span className={labelClass}>Telefono</span>
          <input name="phone" className={inputClass} />
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {pending ? "Salvataggio..." : "Aggiungi indirizzo"}
      </button>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
    </form>
  );
}
