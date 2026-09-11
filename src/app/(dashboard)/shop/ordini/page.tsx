import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, supabaseConfigured } from "@/lib/current-member";
import { formatActivityCode } from "@/lib/activity-code";
import {
  SHOP_ORDER_STATUS_LABEL,
  SHOP_ORDER_STATUS_BADGE_CLASS,
  type ShopOrder,
  type ShopOrderItem,
} from "@/lib/shop-orders";
import { OrderStatusSelect } from "./order-status-select";
import { SegnaOrdiniVisti } from "./segna-visti";
import { ConfirmPaymentButton } from "./confirm-payment-button";
import { getDizionario } from "@/i18n/dizionario";

function formatEuro(value: number) {
  return value.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function ShopOrdersPage() {
  const T = (await getDizionario()).shop;
  if (!supabaseConfigured()) {
    return (
      <p className="rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 text-sm px-4 py-2">
        Supabase non ancora collegato: gli ordini non sono disponibili in modalità demo.
      </p>
    );
  }

  const member = await getCurrentMember();
  const isRoot = member?.activity_code === 0;

  const supabase = await createClient();
  // RLS su shop_orders (buyer_code = current_member_code() or root) fa già
  // il lavoro di scoping: un membro normale vede solo i propri ordini con
  // questa stessa query, l'azienda li vede tutti.
  const [{ data: orders }, { data: items }, { data: members }, { data: products }] = await Promise.all([
    supabase.from("shop_orders").select("*").order("created_at", { ascending: false }),
    supabase.from("shop_order_items").select("*"),
    supabase.from("members").select("activity_code, username"),
    supabase.from("products").select("id, name, code"),
  ]);

  const orderRows = (orders ?? []) as ShopOrder[];
  const itemRows = (items ?? []) as ShopOrderItem[];
  const memberByCode = new Map((members ?? []).map((m) => [m.activity_code, m.username as string]));
  // Due mappe perche' la stessa riga serve a due lettori diversi: chi
  // prepara la spedizione cerca il codice, chi ha comprato riconosce il
  // nome.
  const productById = new Map((products ?? []).map((p) => [p.id, p.name as string]));
  const codeById = new Map((products ?? []).map((p) => [p.id, p.code as string]));
  const itemsByOrder = new Map<number, ShopOrderItem[]>();
  for (const item of itemRows) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  return (
    <div className="glass-card overflow-hidden">
      <SegnaOrdiniVisti attivo={isRoot} />
      <div className="px-4 sm:px-6 py-4 border-b border-[var(--glass-edge)]">
        <h2 className="font-semibold text-gray-900 dark:text-white">
          {isRoot ? T.ordiniRicevuti : T.iTuoiOrdini}
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {isRoot
            ? T.ordiniSottotitoloRoot
            : T.ordiniSottotitolo}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="glass-table tabella-adattiva w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
              {isRoot && <th className="px-6 py-2 font-medium">{T.colUtente}</th>}
              <th className="px-6 py-2 font-medium">{T.colProdotti}</th>
              <th className="px-6 py-2 font-medium">{T.colSpedizione}</th>
              <th className="px-6 py-2 font-medium text-right">{T.totale}</th>
              <th className="px-6 py-2 font-medium">{T.colData}</th>
              <th className="px-6 py-2 font-medium">{T.colStato}</th>
            </tr>
          </thead>
          <tbody>
            {orderRows.map((order) => (
              <tr key={order.id} className="border-t border-[var(--glass-edge)] align-top">
                {isRoot && (
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 dark:text-white">
                        {memberByCode.get(order.buyer_code) ?? "—"}
                      </span>
                      <span className="inline-flex items-center rounded-md bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 text-xs font-medium px-2 py-0.5">
                        {formatActivityCode(order.buyer_code)}
                      </span>
                    </div>
                  </td>
                )}
                <td data-label={T.colProdotti} className="px-6 py-3 text-gray-600 dark:text-gray-300">
                  {(itemsByOrder.get(order.id) ?? []).map((item) => (
                    <div key={item.id}>
                      {isRoot ? (
                        // Il codice in tondo fisso: due prodotti che
                        // differiscono per una cifra si distinguono a colpo
                        // d'occhio solo se le cifre sono incolonnate.
                        <span className="font-mono text-gray-900 dark:text-white">
                          {codeById.get(item.product_id) ?? "—"}
                        </span>
                      ) : (
                        productById.get(item.product_id) ?? "Prodotto"
                      )}{" "}
                      × {item.quantity}
                    </div>
                  ))}
                </td>
                <td data-label={T.colSpedizione} className="px-6 py-3 text-gray-500 dark:text-gray-400">
                  {order.recipient_name}
                  <br />
                  {order.street}, {order.postal_code} {order.city}
                  {order.region ? ` (${order.region})` : ""}, {order.country}
                </td>
                <td data-label={T.totale} className="px-6 py-3 text-right font-medium text-gray-900 dark:text-white">
                  {formatEuro(order.total_amount)}
                </td>
                <td data-label={T.colData} className="px-6 py-3 text-gray-500 dark:text-gray-400">
                  {formatDate(order.created_at)}
                </td>
                <td data-label={T.colStato} className="px-6 py-3">
                  {isRoot ? (
                    <div className="flex flex-col gap-2">
                      <span
                        className={`w-fit text-xs font-medium rounded-full px-2.5 py-1 ${SHOP_ORDER_STATUS_BADGE_CLASS[order.status]}`}
                      >
                        {SHOP_ORDER_STATUS_LABEL[order.status]}
                      </span>
                      {/* Finche' non e' pagato, la cosa da fare e' una
                          sola: confermare l'incasso. Gli altri stati
                          servono dopo. */}
                      {order.paid_at === null && order.status !== "cancelled" ? (
                        <ConfirmPaymentButton
                          id={order.id}
                          totale={formatEuro(order.total_amount)}
                        />
                      ) : null}
                      <OrderStatusSelect
                        id={order.id}
                        status={order.status}
                        pagato={order.paid_at !== null}
                      />
                    </div>
                  ) : (
                    <span
                      className={`w-fit text-xs font-medium rounded-full px-2.5 py-1 ${SHOP_ORDER_STATUS_BADGE_CLASS[order.status]}`}
                    >
                      {SHOP_ORDER_STATUS_LABEL[order.status]}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {orderRows.length === 0 && (
              <tr>
                <td colSpan={isRoot ? 6 : 5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  {isRoot ? T.nessunOrdineRicevuto : T.nessunOrdine}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
