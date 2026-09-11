"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { placeOrder, verificaCoupon, salvaDatiCheckout, type CheckoutState } from "./actions";
import { BloccoIndirizzo, INDIRIZZO_VUOTO, type DatiIndirizzo } from "@/components/blocco-indirizzo";
import { useTesti, riempiTesto } from "@/i18n/testi-client";

const initialState: CheckoutState = { error: null, success: null };

const inputClass =
  "h-11 glass-input px-3.5 text-sm";
const labelClass = "text-sm font-medium text-gray-700 dark:text-gray-300";

function formatEuro(value: number) {
  return value.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

// Quello che si sa gia' di chi sta comprando, se aveva premuto "salva dati"
// una volta: arriva dal server, il modulo lo usa solo come punto di partenza.
export type DatiSalvati = {
  intestatario: string;
  codiceFiscale: string;
  codiceSdi: string;
  destinatario: string;
  telefono: string;
  fatturazione: DatiIndirizzo | null;
  spedizione: DatiIndirizzo | null;
};

export function CheckoutForm({ pagamentoAttivo, dati }: { pagamentoAttivo: boolean; dati: DatiSalvati }) {
  const T = useTesti().shop;
  const { items, subtotal, clear } = useCart();
  const [state, formAction, pending] = useActionState(placeOrder, initialState);
  // Quando il pagamento online non e' ancora acceso non si mostra proprio la
  // scelta: un'opzione che non funziona e' peggio di un'opzione che non c'e'.
  const [metodo, setMetodo] = useState<"stripe" | "bonifico">(pagamentoAttivo ? "stripe" : "bonifico");
  const [prevSuccess, setPrevSuccess] = useState(state.success);
  const [fatturazione, setFatturazione] = useState<DatiIndirizzo>(dati.fatturazione ?? INDIRIZZO_VUOTO);
  const [spedizione, setSpedizione] = useState<DatiIndirizzo>(dati.spedizione ?? INDIRIZZO_VUOTO);
  // Spuntato di partenza: quasi sempre si spedisce dove si fattura, e far
  // riscrivere lo stesso indirizzo due volte e' il modo piu' rapido per
  // farlo sbagliare la seconda.
  const [spedizioneUguale, setSpedizioneUguale] = useState(true);
  const [salvataggio, setSalvataggio] = useState<{ inCorso: boolean; esito: string | null }>({
    inCorso: false,
    esito: null,
  });
  const [intestatarioCorrente, setIntestatarioCorrente] = useState(dati.intestatario);
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
        setCouponErrore(esito.motivo ?? T.codiceNonValido);
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

  const etichetteIndirizzo = {
    paese: T.paese,
    indirizzo: T.indirizzo,
    citta: T.citta,
    cap: T.cap,
    provincia: T.provincia,
    regione: T.regione,
  };

  function salvaDati() {
    const modulo = document.querySelector<HTMLFormElement>("form[data-checkout]");
    if (!modulo) return;
    setSalvataggio({ inCorso: true, esito: null });
    startCouponTransition(async () => {
      const esito = await salvaDatiCheckout(new FormData(modulo));
      setSalvataggio({ inCorso: false, esito: esito.salvato ? "ok" : (esito.errore ?? T.codiceNonValido) });
    });
  }

  if (state.success) {
    return (
      <div className="glass-card p-4 sm:p-5 sm:p-8 text-center max-w-md mx-auto">
        <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          {T.ordineConfermato}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {riempiTesto(T.ordineRicevuto, { id: state.success.orderId })}
        </p>
        <Link href="/shop" className="text-accent font-medium hover:underline">
          {T.tornaAlCatalogo}
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="glass-card p-8 sm:p-12 text-center">
        <p className="text-gray-500 dark:text-gray-400 mb-4">{T.carrelloVuoto}</p>
        <Link href="/shop" className="text-accent font-medium hover:underline">
          {T.tornaAlCatalogo}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} data-checkout className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(items.map((i) => ({ product_id: i.id, quantity: i.quantity })))}
      />

      <div className="flex flex-col gap-6">
        {/* Prima a chi si intesta la fattura: e' il dato che serve per
            legge, e chiederlo per primo evita di scoprire a fine modulo
            che manca il codice fiscale. */}
        <div className="glass-card p-4 sm:p-6 flex flex-col gap-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">{T.datiFatturazione}</h2>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{T.intestatario}</span>
            <input
              name="billing_name"
              required
              value={intestatarioCorrente}
              onChange={(e) => setIntestatarioCorrente(e.target.value)}
              className={inputClass}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">{T.intestatarioAiuto}</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>{T.codiceFiscale}</span>
              <input
                name="billing_tax_id"
                required
                defaultValue={dati.codiceFiscale}
                className={`${inputClass} uppercase`}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>{T.codiceSdi}</span>
              <input
                name="billing_sdi"
                defaultValue={dati.codiceSdi}
                placeholder={T.codiceSdiAiuto}
                className={`${inputClass} uppercase`}
              />
            </label>
          </div>

          <BloccoIndirizzo
            prefisso="billing_"
            valore={fatturazione}
            onChange={setFatturazione}
            etichette={etichetteIndirizzo}
            classeCampo={inputClass}
            classeEtichetta={labelClass}
          />
        </div>

        <div className="glass-card p-4 sm:p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-semibold text-gray-900 dark:text-white">{T.indirizzoSpedizione}</h2>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={spedizioneUguale}
                onChange={(e) => setSpedizioneUguale(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              {T.stessoIndirizzo}
            </label>
          </div>

          {spedizioneUguale ? (
            <>
              {/* Spuntato: si spedisce dove si fattura. I campi non si
                  mostrano ma vanno comunque inviati, altrimenti il server
                  riceverebbe un ordine senza destinazione. */}
              <p className="text-sm text-gray-500 dark:text-gray-400">{T.stessoIndirizzoNota}</p>
              <input type="hidden" name="recipient_name" value={intestatarioCorrente} />
              <input type="hidden" name="street" value={fatturazione.via} />
              <input type="hidden" name="city" value={fatturazione.citta} />
              <input type="hidden" name="region" value={fatturazione.provincia} />
              <input type="hidden" name="country" value={fatturazione.paese} />
              <input type="hidden" name="postal_code" value={fatturazione.cap} />
            </>
          ) : (
            <>
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>{T.nomeDestinatario}</span>
                <input name="recipient_name" required defaultValue={dati.destinatario} className={inputClass} />
              </label>
              <BloccoIndirizzo
                prefisso=""
                valore={spedizione}
                onChange={setSpedizione}
                etichette={etichetteIndirizzo}
                classeCampo={inputClass}
                classeEtichetta={labelClass}
              />
            </>
          )}

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{T.telefono}</span>
            <input name="phone" defaultValue={dati.telefono} className={inputClass} placeholder="opzionale" />
          </label>

          {/* Salvare e' un gesto a parte dall'ordinare: chi compra una volta
              sola non deve lasciare i propri dati per forza. */}
          <div className="flex items-center gap-3 flex-wrap pt-1">
            <button
              type="button"
              onClick={salvaDati}
              disabled={salvataggio.inCorso}
              className="glass-btn-soft rounded-lg px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 disabled:opacity-50"
            >
              {salvataggio.inCorso ? T.invioInCorso : T.salvaDati}
            </button>
            {salvataggio.esito === "ok" && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">{T.datiSalvati}</span>
            )}
            {salvataggio.esito && salvataggio.esito !== "ok" && (
              <span className="text-xs text-red-600 dark:text-red-400">{salvataggio.esito}</span>
            )}
          </div>
        </div>

        {state.error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">
            {state.error}
          </p>
        )}
      </div>

      <div className="glass-card p-4 sm:p-6 h-fit flex flex-col gap-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">{T.riepilogoOrdine}</h2>
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
            {T.buonoSconto}
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
                {T.rimuovi}
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
                {couponPending ? "..." : T.applica}
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
            <span className="text-gray-600 dark:text-gray-300">{T.sconto}</span>
            <span className="font-medium text-gray-900 dark:text-white">−{formatEuro(sconto)}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-white/10 text-sm font-semibold">
          <span className="text-gray-900 dark:text-white">{T.totale}</span>
          <span className="text-gray-900 dark:text-white">{formatEuro(totale)}</span>
        </div>
        {pagamentoAttivo && (
          <div className="flex flex-col gap-2 pt-3 border-t border-gray-200 dark:border-white/10">
            <span className={labelClass}>{T.comeVuoiPagare}</span>
            {[
              { valore: "stripe" as const, titolo: T.pagaOra, dettaglio: T.pagaOraDettaglio },
              { valore: "bonifico" as const, titolo: T.bonifico, dettaglio: T.bonificoDettaglio },
            ].map(({ valore, titolo, dettaglio }) => (
              <label
                key={valore}
                className={`flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer transition-colors ${
                  metodo === valore
                    ? "border-accent bg-accent/5"
                    : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
                }`}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value={valore}
                  checked={metodo === valore}
                  onChange={() => setMetodo(valore)}
                  className="mt-0.5 accent-[var(--accent)]"
                />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{titolo}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{dettaglio}</span>
                </span>
              </label>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="glass-btn-primary rounded-lg px-4 py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {pending
            ? T.invioInCorso
            : pagamentoAttivo && metodo === "stripe"
              ? T.vaiAlPagamento
              : T.confermaOrdine}
        </button>
      </div>
    </form>
  );
}
