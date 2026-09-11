import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/current-member";
import { formatActivityCode } from "@/lib/activity-code";
import { SHOP_ORDER_STATUS_LABEL, type ShopOrderStatus } from "@/lib/shop-orders";

type ExportType = "members" | "sales" | "commissions" | "withdrawals" | "orders";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str = String(value);
  // Nomi e indirizzi li scrivono i clienti. Una cella che comincia con = + -
  // o @ Excel la esegue come formula appena si apre il file: un apostrofo
  // davanti la fa restare testo. I numeri veri (importi) non si toccano.
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(str) && Number.isNaN(Number(str))) {
    str = `'${str}`;
  }
  if (/[",\n;]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvEscape).join(";")];
  for (const row of rows) lines.push(row.map(csvEscape).join(";"));
  return lines.join("\n");
}

export async function GET(request: NextRequest) {
  const member = await getCurrentMember();
  if (!member || member.activity_code !== 0) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const type = new URL(request.url).searchParams.get("type") as ExportType | null;
  if (!type || !["members", "sales", "commissions", "withdrawals", "orders"].includes(type)) {
    return NextResponse.json({ error: "Parametro type non valido" }, { status: 400 });
  }

  const supabase = await createClient();
  let csv: string;

  if (type === "members") {
    const [{ data: members }, { data: ranks }] = await Promise.all([
      supabase
        .from("members")
        .select("activity_code, username, first_name, last_name, role, created_at")
        .order("activity_code", { ascending: true }),
      supabase.from("member_ranks").select("activity_code, rank"),
    ]);
    const rankByCode = new Map((ranks ?? []).map((r) => [r.activity_code, r.rank]));
    csv = toCsv(
      ["Codice", "Username", "Nome", "Cognome", "Ruolo", "Rank", "Iscritto il"],
      (members ?? []).map((m) => [
        formatActivityCode(m.activity_code),
        m.username,
        m.first_name,
        m.last_name,
        m.role,
        rankByCode.get(m.activity_code) ?? "standard",
        m.created_at,
      ]),
    );
  } else if (type === "sales") {
    const [{ data: sales }, { data: members }] = await Promise.all([
      supabase.from("sales").select("id, seller_code, quantity, created_at").order("created_at", { ascending: false }),
      supabase.from("members").select("activity_code, username"),
    ]);
    const usernameByCode = new Map((members ?? []).map((m) => [m.activity_code, m.username]));
    csv = toCsv(
      ["ID vendita", "Codice venditore", "Username venditore", "Quantità", "Data"],
      (sales ?? []).map((s) => [
        s.id,
        formatActivityCode(s.seller_code),
        usernameByCode.get(s.seller_code) ?? "",
        s.quantity,
        s.created_at,
      ]),
    );
  } else if (type === "commissions") {
    const [{ data: entries }, { data: members }] = await Promise.all([
      supabase
        .from("commission_entries")
        .select("id, sale_id, beneficiary_code, level, amount, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("members").select("activity_code, username"),
    ]);
    const usernameByCode = new Map((members ?? []).map((m) => [m.activity_code, m.username]));
    csv = toCsv(
      ["ID commissione", "ID vendita", "Codice beneficiario", "Username beneficiario", "Livello", "Importo", "Data"],
      (entries ?? []).map((e) => [
        e.id,
        e.sale_id,
        formatActivityCode(e.beneficiary_code),
        usernameByCode.get(e.beneficiary_code) ?? "",
        e.level,
        e.amount,
        e.created_at,
      ]),
    );
  } else if (type === "orders") {
    // Un ordine per riga, con tutto quello che serve a spedire e a
    // fatturare senza dover riaprire il back office.
    const [{ data: orders }, { data: items }, { data: products }, { data: members }] = await Promise.all([
      supabase.from("shop_orders").select("*").order("created_at", { ascending: false }),
      supabase.from("shop_order_items").select("order_id, product_id, quantity"),
      supabase.from("products").select("id, code"),
      supabase.from("members").select("activity_code, username"),
    ]);
    const usernameByCode = new Map((members ?? []).map((m) => [m.activity_code, m.username]));
    const codeById = new Map((products ?? []).map((p) => [p.id, p.code as string]));
    const prodottiPerOrdine = new Map<number, string[]>();
    for (const i of items ?? []) {
      const elenco = prodottiPerOrdine.get(i.order_id) ?? [];
      elenco.push(`${codeById.get(i.product_id) ?? i.product_id} x${i.quantity}`);
      prodottiPerOrdine.set(i.order_id, elenco);
    }
    csv = toCsv(
      [
        "ID ordine", "Data", "Stato", "Metodo pagamento", "Pagato il",
        "Codice acquirente", "Username acquirente", "Prodotti", "Totale", "Sconto", "Buono",
        "Intestatario fattura", "Codice fiscale / P.IVA", "Codice SDI / PEC",
        "Fatturazione - indirizzo", "Fatturazione - CAP", "Fatturazione - città",
        "Fatturazione - provincia", "Fatturazione - paese",
        "Destinatario", "Spedizione - indirizzo", "Spedizione - CAP", "Spedizione - città",
        "Spedizione - provincia", "Spedizione - paese", "Telefono",
      ],
      (orders ?? []).map((o) => [
        o.id,
        o.created_at,
        SHOP_ORDER_STATUS_LABEL[o.status as ShopOrderStatus] ?? o.status,
        o.payment_method,
        o.paid_at,
        formatActivityCode(o.buyer_code),
        usernameByCode.get(o.buyer_code) ?? "",
        (prodottiPerOrdine.get(o.id) ?? []).join(", "),
        o.total_amount,
        o.discount_amount,
        o.coupon_code,
        o.billing_name,
        o.billing_tax_id,
        o.billing_sdi,
        o.billing_street,
        o.billing_postal_code,
        o.billing_city,
        o.billing_region,
        o.billing_country,
        o.recipient_name,
        o.street,
        o.postal_code,
        o.city,
        o.region,
        o.country,
        o.phone,
      ]),
    );
  } else {
    const [{ data: withdrawals }, { data: members }] = await Promise.all([
      supabase
        .from("withdrawal_requests")
        .select(
          "id, activity_code, amount, charges, tax, net_amount, bank_name, iban, status, created_at, processed_at",
        )
        .order("created_at", { ascending: false }),
      supabase.from("members").select("activity_code, username"),
    ]);
    const usernameByCode = new Map((members ?? []).map((m) => [m.activity_code, m.username]));
    csv = toCsv(
      [
        "ID richiesta",
        "Codice",
        "Username",
        "Importo",
        "Commissioni",
        "Tasse",
        "Netto",
        "Banca",
        "IBAN",
        "Stato",
        "Richiesta il",
        "Evasa il",
      ],
      (withdrawals ?? []).map((w) => [
        w.id,
        formatActivityCode(w.activity_code),
        usernameByCode.get(w.activity_code) ?? "",
        w.amount,
        w.charges,
        w.tax,
        w.net_amount,
        w.bank_name,
        w.iban,
        w.status,
        w.created_at,
        w.processed_at,
      ]),
    );
  }

  const filename = `gmg-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
