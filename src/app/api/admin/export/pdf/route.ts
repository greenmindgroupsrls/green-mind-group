import { NextResponse, type NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/current-member";
import { formatActivityCode } from "@/lib/activity-code";
import { getDizionario } from "@/i18n/dizionario";
import { SHOP_ORDER_STATUS_LABEL, type ShopOrderStatus } from "@/lib/shop-orders";
import { WITHDRAWAL_STATUS_LABEL, type WithdrawalStatus } from "@/lib/withdrawals";
import { etichettaProvvigione } from "@/lib/piano-compensi";
import type { CommissionKind } from "@/lib/commissions";
import { RANK_LABEL, type Rank } from "@/lib/rank";
import {
  confiniMese,
  meseLeggibile,
  meseValido,
  nomeMembro,
  tipoConMese,
  tipoValido,
  type TipoFascicolo,
} from "@/lib/esportazioni";
import { costruisciFascicolo, dataPdf, euroPdf, type OpzioniFascicolo } from "@/lib/fascicolo-pdf";

// Il PDF di una persona per una voce delle esportazioni. Solo l'account
// aziendale: dentro ci sono indirizzi e movimenti di altri.

export const dynamic = "force-dynamic";

const NOME_FILE: Record<TipoFascicolo, string> = {
  orders: "ordini",
  withdrawals: "prelievi",
  sales: "vendite",
  commissions: "provvigioni",
  members: "scheda",
};

// Il marchio si legge dal disco; se in quell'ambiente il file non c'e', lo
// si chiede al sito stesso; se nemmeno cosi', il PDF esce senza logo invece
// di non uscire.
async function caricaLogo(request: NextRequest): Promise<Uint8Array | null> {
  try {
    return new Uint8Array(await readFile(path.join(process.cwd(), "public", "marchio", "simbolo.png")));
  } catch {
    try {
      const r = await fetch(new URL("/marchio/simbolo.png", request.url));
      return r.ok ? new Uint8Array(await r.arrayBuffer()) : null;
    } catch {
      return null;
    }
  }
}

function ibanMascherato(iban: string | null): string {
  if (!iban) return "-";
  const pulito = iban.replace(/\s+/g, "");
  return pulito.length <= 4 ? pulito : `**** ${pulito.slice(-4)}`;
}

export async function GET(request: NextRequest) {
  const chi = await getCurrentMember();
  if (!chi || chi.activity_code !== 0) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const p = new URL(request.url).searchParams;
  const tipo = p.get("tipo");
  const mese = p.get("mese");
  const codice = Number(p.get("membro"));
  if (!tipoValido(tipo)) return NextResponse.json({ error: "Tipo non valido" }, { status: 400 });
  if (!Number.isInteger(codice) || codice < 0) {
    return NextResponse.json({ error: "Membro non valido" }, { status: 400 });
  }
  if (tipoConMese(tipo) && !meseValido(mese)) {
    return NextResponse.json({ error: "Mese non valido (atteso AAAA-MM)" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: membro } = await supabase
    .from("members")
    .select("activity_code, username, first_name, last_name, email, role, created_at, ref_sponsor_code, parent_code")
    .eq("activity_code", codice)
    .maybeSingle();
  if (!membro) return NextResponse.json({ error: "Membro non trovato" }, { status: 404 });

  const intestato = { codice: formatActivityCode(codice), nome: nomeMembro(membro) };
  const periodo = tipoConMese(tipo) ? meseLeggibile(mese!) : null;
  const { da, a } = tipoConMese(tipo) ? confiniMese(mese!) : { da: "", a: "" };
  const base = { membro: intestato, periodo, logo: await caricaLogo(request) };
  let opzioni: OpzioniFascicolo;

  if (tipo === "orders") {
    const { data: ordini } = await supabase
      .from("shop_orders")
      .select("*")
      .eq("buyer_code", codice)
      .gte("created_at", da)
      .lt("created_at", a)
      .order("created_at", { ascending: true });
    const ids = (ordini ?? []).map((o) => o.id);
    const [{ data: righeOrdine }, { data: prodotti }] = await Promise.all([
      ids.length
        ? supabase.from("shop_order_items").select("order_id, product_id, quantity").in("order_id", ids)
        : Promise.resolve({ data: [] as { order_id: number; product_id: number; quantity: number }[] }),
      supabase.from("products").select("id, code"),
    ]);
    const codiceProdotto = new Map((prodotti ?? []).map((x) => [x.id, x.code as string]));
    const perOrdine = new Map<number, string[]>();
    for (const r of righeOrdine ?? []) {
      const l = perOrdine.get(r.order_id) ?? [];
      l.push(`${codiceProdotto.get(r.product_id) ?? r.product_id} x${r.quantity}`);
      perOrdine.set(r.order_id, l);
    }
    const lista = ordini ?? [];
    opzioni = {
      ...base,
      titolo: "Riepilogo ordini",
      colonne: [
        { titolo: "N.", quota: 0.07 },
        { titolo: "Data", quota: 0.13 },
        { titolo: "Prodotti", quota: 0.26 },
        { titolo: "Pagamento", quota: 0.12 },
        // Larga abbastanza per "In attesa di pagamento" intero: e' lo stato
        // piu' frequente, e troncato non si capisce.
        { titolo: "Stato", quota: 0.24 },
        { titolo: "Totale", quota: 0.18, destra: true },
      ],
      righe: lista.map((o) => [
        String(o.id),
        dataPdf(o.created_at),
        (perOrdine.get(o.id) ?? []).join(", "),
        o.payment_method === "stripe" ? "Online" : "Bonifico",
        SHOP_ORDER_STATUS_LABEL[o.status as ShopOrderStatus] ?? o.status,
        euroPdf(o.total_amount),
      ]),
      vuoto: "Nessun ordine in questo mese.",
      totali: [
        ["Ordini", String(lista.length)],
        ["Sconti", euroPdf(lista.reduce((s, o) => s + Number(o.discount_amount ?? 0), 0))],
        ["Totale", euroPdf(lista.reduce((s, o) => s + Number(o.total_amount), 0))],
      ],
      blocchi: lista.map((o) => ({
        titolo: `Ordine N. ${o.id} - fatturazione e spedizione`,
        voci: [
          ["Intestatario", o.billing_name ?? "Non raccolto (ordine precedente al modulo)"],
          ["C.F. / P.IVA", o.billing_tax_id ?? "-"],
          ["SDI / PEC", o.billing_sdi ?? "-"],
          [
            "Fatturazione",
            o.billing_street
              ? `${o.billing_street}, ${o.billing_postal_code} ${o.billing_city}${o.billing_region ? ` (${o.billing_region})` : ""}, ${o.billing_country}`
              : "-",
          ],
          ["Destinatario", o.recipient_name],
          ["Spedizione", `${o.street}, ${o.postal_code} ${o.city}${o.region ? ` (${o.region})` : ""}, ${o.country}`],
          ["Telefono", o.phone ?? "-"],
          ["Buono", o.coupon_code ? `${o.coupon_code} (-${euroPdf(o.discount_amount)})` : "-"],
        ] as [string, string][],
      })),
    };
  } else if (tipo === "withdrawals") {
    const { data } = await supabase
      .from("withdrawal_requests")
      .select("id, amount, charges, tax, net_amount, bank_name, iban, status, created_at, processed_at")
      .eq("activity_code", codice)
      .gte("created_at", da)
      .lt("created_at", a)
      .order("created_at", { ascending: true });
    const lista = data ?? [];
    opzioni = {
      ...base,
      titolo: "Riepilogo prelievi",
      colonne: [
        { titolo: "N.", quota: 0.07 },
        { titolo: "Richiesto il", quota: 0.15 },
        { titolo: "IBAN", quota: 0.15 },
        { titolo: "Stato", quota: 0.15 },
        { titolo: "Importo", quota: 0.16, destra: true },
        { titolo: "Trattenute", quota: 0.16, destra: true },
        { titolo: "Netto", quota: 0.16, destra: true },
      ],
      righe: lista.map((w) => [
        String(w.id),
        dataPdf(w.created_at),
        ibanMascherato(w.iban),
        WITHDRAWAL_STATUS_LABEL[w.status as WithdrawalStatus] ?? w.status,
        euroPdf(w.amount),
        euroPdf(Number(w.charges ?? 0) + Number(w.tax ?? 0)),
        euroPdf(w.net_amount),
      ]),
      vuoto: "Nessuna richiesta di prelievo in questo mese.",
      totali: [
        ["Richiesto", euroPdf(lista.reduce((s, w) => s + Number(w.amount), 0))],
        ["Netto", euroPdf(lista.reduce((s, w) => s + Number(w.net_amount ?? 0), 0))],
      ],
    };
  } else if (tipo === "sales") {
    const [{ data }, { data: prodotti }] = await Promise.all([
      supabase
        .from("sales")
        .select("id, quantity, product_id, created_at")
        .eq("seller_code", codice)
        .gte("created_at", da)
        .lt("created_at", a)
        .order("created_at", { ascending: true }),
      supabase.from("products").select("id, code"),
    ]);
    const codiceProdotto = new Map((prodotti ?? []).map((x) => [x.id, x.code as string]));
    const lista = data ?? [];
    opzioni = {
      ...base,
      titolo: "Riepilogo vendite",
      colonne: [
        { titolo: "N. vendita", quota: 0.2 },
        { titolo: "Data", quota: 0.3 },
        { titolo: "Prodotto", quota: 0.3 },
        { titolo: "Pezzi", quota: 0.2, destra: true },
      ],
      righe: lista.map((s) => [
        String(s.id),
        dataPdf(s.created_at, true),
        s.product_id ? (codiceProdotto.get(s.product_id) ?? String(s.product_id)) : "-",
        String(s.quantity),
      ]),
      vuoto: "Nessuna vendita in questo mese.",
      totali: [
        ["Vendite", String(lista.length)],
        ["Pezzi", String(lista.reduce((s, x) => s + Number(x.quantity), 0))],
      ],
    };
  } else if (tipo === "commissions") {
    const [{ data }, dizionario] = await Promise.all([
      supabase
        .from("commission_entries")
        .select("id, sale_id, kind, level, amount, created_at, settlement_id")
        .eq("beneficiary_code", codice)
        .gte("created_at", da)
        .lt("created_at", a)
        .order("created_at", { ascending: true }),
      // Le stesse parole del back office, in italiano: un documento per il
      // commercialista non cambia lingua secondo chi l'ha scaricato.
      getDizionario("it"),
    ]);
    const lista = data ?? [];
    opzioni = {
      ...base,
      titolo: "Estratto provvigioni",
      colonne: [
        { titolo: "Data", quota: 0.18 },
        { titolo: "Tipo", quota: 0.36 },
        { titolo: "Vendita N.", quota: 0.16 },
        { titolo: "Liquidata", quota: 0.12 },
        { titolo: "Importo", quota: 0.18, destra: true },
      ],
      righe: lista.map((c) => [
        dataPdf(c.created_at),
        etichettaProvvigione(c.kind as CommissionKind | null, c.level, dizionario.provvigioni),
        c.sale_id ? String(c.sale_id) : "-",
        c.settlement_id ? "Si" : "No",
        euroPdf(c.amount),
      ]),
      vuoto: "Nessuna provvigione in questo mese.",
      totali: [
        ["Righe", String(lista.length)],
        ["Totale", euroPdf(lista.reduce((s, c) => s + Number(c.amount), 0))],
      ],
    };
  } else {
    // Scheda membro: anagrafica e rete. Niente codice fiscale ne' IBAN, per
    // scelta: e' il documento che piu' facilmente gira, e deve poterlo fare.
    const [{ data: profilo }, { data: rango }, { data: forzato }, { data: tutti }] = await Promise.all([
      supabase.from("member_profiles").select("phone_country_code, phone_number").eq("activity_code", codice).maybeSingle(),
      supabase.from("member_ranks").select("rank").eq("activity_code", codice).maybeSingle(),
      supabase.from("member_rank_overrides").select("rank").eq("activity_code", codice).maybeSingle(),
      supabase.from("members").select("activity_code, username, first_name, last_name, parent_code, ref_sponsor_code"),
    ]);
    const elenco = tutti ?? [];
    const perCodice = new Map(elenco.map((m) => [m.activity_code, m]));
    const figliDi = new Map<number, number[]>();
    for (const m of elenco) {
      if (m.parent_code === null) continue;
      const l = figliDi.get(m.parent_code) ?? [];
      l.push(m.activity_code);
      figliDi.set(m.parent_code, l);
    }
    let squadra = 0;
    const pila = [...(figliDi.get(codice) ?? [])];
    while (pila.length) {
      const c = pila.pop()!;
      squadra += 1;
      pila.push(...(figliDi.get(c) ?? []));
    }
    const diretti = elenco.filter((m) => m.ref_sponsor_code === codice).length;
    const chiamaMembro = (c: number | null) => {
      if (c === null) return "-";
      const m = perCodice.get(c);
      return m ? `${formatActivityCode(c)} ${nomeMembro(m)}` : formatActivityCode(c);
    };
    const rank = ((forzato?.rank ?? rango?.rank ?? "standard") as Rank);
    const telefono = [profilo?.phone_country_code, profilo?.phone_number].filter(Boolean).join(" ");

    opzioni = {
      ...base,
      titolo: "Scheda membro",
      dati: [
        ["Codice", formatActivityCode(codice)],
        ["Nome", nomeMembro(membro)],
        ["Username", membro.username],
        ["Email", membro.email ?? "-"],
        ["Telefono", telefono || "-"],
        ["Ruolo", membro.role === "incaricato" ? "Incaricato" : "Cliente"],
        ["Qualifica", `${RANK_LABEL[rank] ?? rank}${forzato ? " (forzata)" : ""}`],
        ["Iscritto il", dataPdf(membro.created_at)],
        ["Sponsor", chiamaMembro(membro.ref_sponsor_code)],
        ["Posizione nell'albero", chiamaMembro(membro.parent_code)],
        ["Diretti iscritti", String(diretti)],
        ["Squadra totale", String(squadra)],
      ],
    };
  }

  const bytes = await costruisciFascicolo(opzioni);
  const nome = `gmg-${NOME_FILE[tipo]}-${intestato.codice}${mese && tipoConMese(tipo) ? `-${mese}` : ""}.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}
