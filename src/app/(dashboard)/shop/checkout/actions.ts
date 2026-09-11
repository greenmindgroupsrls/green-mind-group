"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/current-member";
import { formatActivityCode } from "@/lib/activity-code";
import { sendNewShopOrderNotification } from "@/lib/email";
import { messaggioErrore } from "@/i18n/errori";
import { getDizionario } from "@/i18n/dizionario";
import { getStripe, stripeConfigurato, inCentesimi, ETICHETTA_INTEGRAZIONE } from "@/lib/stripe";

export type CheckoutItem = { product_id: number; quantity: number };

export type CheckoutState = {
  error: string | null;
  success: { orderId: number } | null;
};

// Bonifico: l'ordine resta in attesa e lo conferma l'azienda a mano, come si
// e' sempre fatto. Stripe: si paga subito e la conferma arriva dall'incasso.
export type MetodoPagamento = "bonifico" | "stripe";

export type CouponCheck = { valido: boolean; importo: number; motivo: string | null };

// Controllo prima dell'invio, per non far scoprire un codice sbagliato solo
// a ordine confermato. Il controllo che conta resta comunque quello dentro
// create_shop_order: e' li' che il buono viene bloccato e speso.
export async function verificaCoupon(code: string): Promise<CouponCheck> {
  const pulito = code.trim().toUpperCase();
  if (!pulito) return { valido: false, importo: 0, motivo: "Inserisci un codice" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verifica_coupon", { p_code: pulito }).single();
  if (error) return { valido: false, importo: 0, motivo: "Non riusciamo a verificare il codice" };

  const riga = data as { valido: boolean; importo: number; motivo: string | null };
  return { valido: riga.valido, importo: Number(riga.importo ?? 0), motivo: riga.motivo };
}

export async function placeOrder(
  _prevState: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  let items: CheckoutItem[];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { error: "Carrello non valido", success: null };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { error: "Il carrello è vuoto", success: null };
  }

  const recipientName = String(formData.get("recipient_name") ?? "").trim();
  const street = String(formData.get("street") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const postalCode = String(formData.get("postal_code") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const coupon = String(formData.get("coupon_code") ?? "").trim().toUpperCase();
  const fatt = {
    nome: String(formData.get("billing_name") ?? "").trim(),
    codice: String(formData.get("billing_tax_id") ?? "").trim(),
    sdi: String(formData.get("billing_sdi") ?? "").trim(),
    via: String(formData.get("billing_street") ?? "").trim(),
    citta: String(formData.get("billing_city") ?? "").trim(),
    provincia: String(formData.get("billing_region") ?? "").trim(),
    paese: String(formData.get("billing_country") ?? "").trim(),
    cap: String(formData.get("billing_postal_code") ?? "").trim(),
  };

  const metodo: MetodoPagamento =
    String(formData.get("payment_method") ?? "bonifico") === "stripe" ? "stripe" : "bonifico";

  if (!recipientName) return { error: "Nome destinatario obbligatorio", success: null };
  if (!street) return { error: "Indirizzo obbligatorio", success: null };
  if (!city) return { error: "Città obbligatoria", success: null };
  if (!country) return { error: "Paese obbligatorio", success: null };
  if (!postalCode) return { error: "CAP obbligatorio", success: null };

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .rpc("create_shop_order", {
      p_items: items,
      p_recipient_name: recipientName,
      p_street: street,
      p_city: city,
      p_region: region || null,
      p_country: country,
      p_postal_code: postalCode,
      p_phone: phone || null,
      p_coupon_code: coupon || null,
      p_billing_name: fatt.nome || null,
      p_billing_tax_id: fatt.codice || null,
      p_billing_sdi: fatt.sdi || null,
      // Vuoti = coincide con la spedizione: e' il database a ricopiarli,
      // cosi' la regola vale anche se un domani l'ordine nasce altrove.
      p_billing_street: fatt.via || null,
      p_billing_city: fatt.citta || null,
      p_billing_region: fatt.provincia || null,
      p_billing_country: fatt.paese || null,
      p_billing_postal_code: fatt.cap || null,
    })
    .single();

  if (error || !order) {
    return { error: messaggioErrore(error, await getDizionario()), success: null };
  }

  const orderRow = order as { id: number; total_amount: number };

  const member = await getCurrentMember();
  if (member && member.activity_code !== 0) {
    const { data: root } = await supabase.from("members").select("email").eq("activity_code", 0).single();
    if (root?.email) {
      await sendNewShopOrderNotification({
        to: root.email,
        memberName: member.username,
        memberCode: formatActivityCode(member.activity_code),
        orderId: orderRow.id,
        totalAmount: orderRow.total_amount,
      });
    }
  }

  // L'ordine genera una vendita/commissioni reali (register_sale interno a
  // create_shop_order): invalida la cache di rete come ogni altra azione
  // che tocca members/sales/commission_entries.
  revalidateTag("network-data", { expire: 0 });

  if (metodo === "stripe") {
    const destinazione = await preparaPagamentoStripe(orderRow.id);
    if (destinazione.errore) return { error: destinazione.errore, success: null };
    // redirect() lancia di proposito: va chiamato fuori da qualsiasi try.
    redirect(destinazione.url!);
  }

  return { error: null, success: { orderId: orderRow.id } };
}

// Costruisce la pagina di pagamento di Stripe a partire da quello che c'e'
// scritto nell'ordine, non da quello che dice il browser: gli importi si
// rileggono dal database, altrimenti basterebbe manomettere il carrello per
// comprare a un prezzo deciso da chi compra.
async function preparaPagamentoStripe(
  orderId: number,
): Promise<{ url: string | null; errore: string | null }> {
  if (!stripeConfigurato()) {
    return { url: null, errore: "Il pagamento con carta non e' ancora attivo." };
  }

  const supabase = await createClient();
  const [{ data: ordine }, { data: righe }] = await Promise.all([
    supabase
      .from("shop_orders")
      .select("id, total_amount, discount_amount, recipient_name")
      .eq("id", orderId)
      .single(),
    supabase.from("shop_order_items").select("quantity, unit_price, product_id").eq("order_id", orderId),
  ]);

  if (!ordine || !righe || righe.length === 0) {
    return { url: null, errore: "Ordine non trovato" };
  }

  const { data: prodotti } = await supabase
    .from("products")
    .select("id, name")
    .in("id", righe.map((r) => r.product_id));
  const nomePerId = new Map((prodotti ?? []).map((p) => [p.id, p.name as string]));

  const sconto = Number(ordine.discount_amount ?? 0);
  const sommaRighe = righe.reduce((s, r) => s + Number(r.unit_price) * r.quantity, 0);

  // Se questi due numeri non tornano, qualcosa non quadra fra quello che
  // mostriamo e quello che incassiamo: meglio fermarsi che addebitare una
  // cifra diversa da quella scritta a schermo.
  if (Math.abs(sommaRighe - sconto - Number(ordine.total_amount)) > 0.01) {
    return { url: null, errore: "Il totale dell'ordine non torna: non procediamo al pagamento." };
  }

  const intestazioni = await headers();
  const host = intestazioni.get("host") ?? "greenmindgroup.pro";
  const protocollo = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const base = `${protocollo}://${host}`;

  const stripe = getStripe();

  // Lo sconto del buono diventa uno sconto vero sulla pagina di Stripe,
  // invece di sparire dentro prezzi ritoccati: chi paga vede quanto ha
  // risparmiato e perche'.
  const sconti = sconto > 0
    ? [{ coupon: (await stripe.coupons.create({
        amount_off: inCentesimi(sconto),
        currency: "eur",
        duration: "once",
        name: "Buono sondaggio",
      })).id }]
    : undefined;

  const sessione = await stripe.checkout.sessions.create({
    mode: "payment",
    locale: "it",
    client_reference_id: String(ordine.id),
    metadata: { order_id: String(ordine.id) },
    integration_identifier: ETICHETTA_INTEGRAZIONE,
    line_items: righe.map((r) => ({
      quantity: r.quantity,
      price_data: {
        currency: "eur",
        unit_amount: inCentesimi(Number(r.unit_price)),
        product_data: { name: nomePerId.get(r.product_id) ?? `Prodotto ${r.product_id}` },
      },
    })),
    discounts: sconti,
    success_url: `${base}/shop/ordini?pagamento=ok&ordine=${ordine.id}`,
    cancel_url: `${base}/shop/checkout?pagamento=annullato`,
  });

  if (!sessione.url) return { url: null, errore: "Stripe non ha restituito una pagina di pagamento" };

  // Il legame ordine-sessione va scritto PRIMA di mandare via l'utente:
  // e' con quello che l'avviso di incasso ritrova l'ordine da confermare.
  const { error: erroreLegame } = await supabase.rpc("collega_sessione_stripe", {
    p_order_id: ordine.id,
    p_session_id: sessione.id,
  });
  if (erroreLegame) {
    return { url: null, errore: messaggioErrore(erroreLegame, await getDizionario()) };
  }

  return { url: sessione.url, errore: null };
}

export type SalvataggioDati = { errore: string | null; salvato: boolean };

// "Salva dati": mette da parte fatturazione e spedizione, cosi' il prossimo
// ordine parte gia' compilato.
//
// Le due cose finiscono in due posti diversi perche' sono due cose diverse:
// il codice fiscale e il codice SDI sono dati della persona e vivono nel
// profilo (li si vede anche in Impostazioni), gli indirizzi vanno fra i
// propri indirizzi salvati, ognuno col suo tipo.
export async function salvaDatiCheckout(formData: FormData): Promise<SalvataggioDati> {
  const supabase = await createClient();
  const dizionario = await getDizionario();

  const leggi = (k: string) => String(formData.get(k) ?? "").trim();

  const codice = leggi("billing_tax_id");
  const intestatario = leggi("billing_name");
  if (!intestatario || !codice) {
    return { errore: dizionario.errori.codice_fiscale_obbligatorio, salvato: false };
  }

  // Codice fiscale e codice SDI stanno nel profilo: sono della persona, non
  // dell'ordine, e da li' li vede anche Impostazioni. L'intestatario invece
  // no: per un privato e' il proprio nome, per una ditta la ragione sociale,
  // e scriverlo a occhi chiusi in company_name sarebbe sbagliato per meta'
  // dei casi. Viaggia con l'indirizzo di fatturazione, che e' il suo posto.
  const { error: erroreProfilo } = await supabase.rpc("upsert_own_profile", {
    p_tax_id: codice,
    p_sdi_code: leggi("billing_sdi") || null,
  });
  if (erroreProfilo) return { errore: messaggioErrore(erroreProfilo, dizionario), salvato: false };

  const indirizzi: { tipo: "billing" | "shipping"; prefisso: string; nome: string }[] = [
    { tipo: "billing", prefisso: "billing_", nome: intestatario },
    { tipo: "shipping", prefisso: "", nome: leggi("recipient_name") || intestatario },
  ];

  for (const { tipo, prefisso, nome } of indirizzi) {
    const via = leggi(`${prefisso}street`);
    const citta = leggi(`${prefisso}city`);
    const paese = leggi(`${prefisso}country`);
    const cap = leggi(`${prefisso}postal_code`);
    // Un indirizzo a meta' non si salva: ricomparirebbe incompleto al
    // prossimo ordine, che e' peggio di non averlo.
    if (!via || !citta || !paese || !cap) continue;

    const { error } = await supabase.rpc("add_own_address", {
      p_recipient_name: nome,
      p_street: via,
      p_city: citta,
      p_region: leggi(`${prefisso}region`) || null,
      p_country: paese,
      p_postal_code: cap,
      p_phone: leggi("phone") || null,
      p_type: tipo,
    });
    if (error) return { errore: messaggioErrore(error, dizionario), salvato: false };
  }

  revalidatePath("/impostazioni/indirizzi");
  return { errore: null, salvato: true };
}
