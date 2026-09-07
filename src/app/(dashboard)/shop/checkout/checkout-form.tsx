"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { placeOrder, verificaCoupon, type CheckoutState } from "./actions";
import { EUROPEAN_COUNTRIES, flagEmoji } from "@/lib/countries";
import { StreetAutocompleteInput, type AddressSuggestion } from "@/components/street-autocomplete-input";

const initialState: CheckoutState = { error: null, success: null };

const inputClass =
  "h-11 glass-input px-3.5 text-sm";
const labelClass = "text-sm font-medium text-gray-700 dark:text-gray-300";

function formatEuro(value: number) {
  return value.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

const emptyAddress = { street: "", city: "", region: "", postalCode: "", country: "Italia" };

export function CheckoutForm() {
  const { items, subtotal, clear } = useCart();
  const [state, formAction, pending] = useActionState(placeOrder, initialState);
  const [prevSuccess, setPrevSuccess] = useState(state.success);
  const [address, setAddress] = useState(emptyAddress);
  const [coupon, setCoupon] = useState("");
  const [scontoApplicato, setScontoApplicato] = useState<{ codice: string; importo: number } | null>(null);
  const [couponErrore, setCouponErrore] = useState<string | null>(null);
  const [couponPending, startCouponTransition] = useTransition();

  // Lo sconto non puo' superare il totale: il buono sconta, non rimborsa.
  const sconto = scontoApplicato ? Math.min(scontoApplicato.importo, subtotal) : 0;
  const totale = subtotal - sconto;

  function applicaCoupon() {
    setCouponErrore(null);
    startCouponTransition(async () => {
      const esito = await verificaCoupon(coupon);
      if (esito.valido) {
        setScontoApplicato({ codice: coupon.trim().toUpperCase(), importo: esito.importo });
      } else {
        setScontoApplicato(null);
        setCouponErrore(esito.motivo ?? "Codice non valido");
      }
    });
  }

  function rimuoviCoupon() {
    setScontoApplicato(null);
    setCoupon("");
    setCouponErrore(null);
  }

  if (state.success !== prevSuccess) {
    setPrevSuccess(state.success);
    if (state.success) clear();
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

  if (state.success) {
    return (
      <div className="glass-card p-8 text-center max-w-md mx-auto">
        <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Ordine confermato
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Ordine #{state.success.orderId} ricevuto. Il nostro team lo evaderà a breve.
        </p>
        <Link href="/shop" className="text-accent font-medium hover:underline">
          Torna al catalogo
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Il tuo carrello è vuoto.</p>
        <Link href="/shop" className="text-accent font-medium hover:underline">
          Torna al catalogo
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(items.map((i) => ({ product_id: i.id, quantity: i.quantity })))}
      />

      <div className="glass-card p-6 flex flex-col gap-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">Indirizzo di spedizione</h2>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Nome destinatario *</span>
          <input name="recipient_name" required className={inputClass} />
        </label>

        <StreetAutocompleteInput
          name="street"
          label="Indirizzo *"
          value={address.street}
          onChange={(v) => setAddress((prev) => ({ ...prev, street: v }))}
          onSelect={handleSelectSuggestion}
          countryIso2={selectedIso2}
          className={inputClass}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Città *</span>
            <input
              name="city"
              required
              value={address.city}
              onChange={(e) => setAddress((prev) => ({ ...prev, city: e.target.value }))}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>CAP *</span>
            <input
              name="postal_code"
              required
              value={address.postalCode}
              onChange={(e) => setAddress((prev) => ({ ...prev, postalCode: e.target.value }))}
              className={inputClass}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Provincia</span>
            <input
              name="region"
              value={address.region}
              onChange={(e) => setAddress((prev) => ({ ...prev, region: e.target.value }))}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Paese *</span>
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
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Telefono</span>
          <input name="phone" className={inputClass} placeholder="opzionale" />
        </label>

        {state.error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
            {state.error}
          </p>
        )}
      </div>

      <div className="glass-card p-6 h-fit flex flex-col gap-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">Riepilogo ordine</h2>
        <div className="flex flex-col divide-y divide-gray-100 dark:divide-white/5">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-gray-600 dark:text-gray-300">
                {item.name} × {item.quantity}
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatEuro(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2 pt-2 border-t border-gray-200 dark:border-white/10">
          <label className={labelClass} htmlFor="coupon">
            Buono sconto
          </label>
          {scontoApplicato ? (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-[var(--accent)]/15 px-3 py-2">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {scontoApplicato.codice}
              </span>
              <button
                type="button"
                onClick={rimuoviCoupon}
                className="text-xs text-gray-600 dark:text-gray-300 hover:underline shrink-0"
              >
                Rimuovi
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                id="coupon"
                value={coupon}
                onChange={(e) => {
                  setCoupon(e.target.value.toUpperCase());
                  setCouponErrore(null);
                }}
                placeholder="VORTIX-XXXXX"
                autoComplete="off"
                className={`${inputClass} flex-1 min-w-0 uppercase`}
              />
              <button
                type="button"
                onClick={applicaCoupon}
                disabled={couponPending || !coupon.trim()}
                className="glass-btn-soft rounded-lg px-3 h-11 text-sm font-medium shrink-0 disabled:opacity-40"
              >
                {couponPending ? "..." : "Applica"}
              </button>
            </div>
          )}
          {couponErrore && (
            <p className="text-xs text-red-600 dark:text-red-400">{couponErrore}</p>
          )}
          <input type="hidden" name="coupon_code" value={scontoApplicato?.codice ?? ""} />
        </div>

        {sconto > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">Sconto</span>
            <span className="font-medium text-gray-900 dark:text-white">−{formatEuro(sconto)}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-white/10 text-sm font-semibold">
          <span className="text-gray-900 dark:text-white">Totale</span>
          <span className="text-gray-900 dark:text-white">{formatEuro(totale)}</span>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="glass-btn-primary rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {pending ? "Invio in corso..." : "Conferma ordine"}
        </button>
      </div>
    </form>
  );
}
