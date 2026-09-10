"use server";

import { revalidateTag } from "next/cache";
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
