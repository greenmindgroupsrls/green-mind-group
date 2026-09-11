import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/current-member";
import { formatActivityCode } from "@/lib/activity-code";
import {
  confiniMese,
  meseValido,
  nomeMembro,
  tipoConMese,
  tipoValido,
} from "@/lib/esportazioni";

// Chi compare sotto una voce in un mese: per ogni persona quante righe ha e
// quanto fanno in tutto. E' l'elenco accanto al quale si scarica il PDF.
//
// Compare solo chi ha qualcosa in quel mese: una lista di otto nomi dove
// sette non hanno ordini fa cercare il nome giusto invece di trovarlo.

export const dynamic = "force-dynamic";

type Riga = { codice: number; codiceFormattato: string; nome: string; quanti: number | null; totale: number | null };

export async function GET(request: NextRequest) {
  const membro = await getCurrentMember();
  if (!membro || membro.activity_code !== 0) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const parametri = new URL(request.url).searchParams;
  const tipo = parametri.get("tipo");
  const mese = parametri.get("mese");
  if (!tipoValido(tipo)) {
    return NextResponse.json({ error: "Tipo non valido" }, { status: 400 });
  }
  if (tipoConMese(tipo) && !meseValido(mese)) {
    return NextResponse.json({ error: "Mese non valido (atteso AAAA-MM)" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: membri } = await supabase
    .from("members")
    .select("activity_code, username, first_name, last_name");
  const perCodice = new Map((membri ?? []).map((m) => [m.activity_code, m]));

  // codice -> { quanti, totale }
  const conti = new Map<number, { quanti: number; totale: number }>();
  const somma = (codice: number, valore: number) => {
    const c = conti.get(codice) ?? { quanti: 0, totale: 0 };
    c.quanti += 1;
    c.totale += valore;
    conti.set(codice, c);
  };

  if (tipo === "members") {
    const righe: Riga[] = (membri ?? []).map((m) => ({
      codice: m.activity_code,
      codiceFormattato: formatActivityCode(m.activity_code),
      nome: nomeMembro(m),
      quanti: null,
      totale: null,
    }));
    righe.sort((a, b) => a.codice - b.codice);
    return NextResponse.json({ righe });
  }

  const { da, a } = confiniMese(mese!);

  if (tipo === "orders") {
    const { data } = await supabase
      .from("shop_orders")
      .select("buyer_code, total_amount")
      .gte("created_at", da)
      .lt("created_at", a);
    for (const r of data ?? []) somma(r.buyer_code, Number(r.total_amount));
  } else if (tipo === "withdrawals") {
    const { data } = await supabase
      .from("withdrawal_requests")
      .select("activity_code, amount")
      .gte("created_at", da)
      .lt("created_at", a);
    for (const r of data ?? []) somma(r.activity_code, Number(r.amount));
  } else if (tipo === "sales") {
    // Per le vendite il "totale" sono i pezzi, non gli euro: la tabella
    // sales registra quantita', gli importi stanno negli ordini.
    const { data } = await supabase
      .from("sales")
      .select("seller_code, quantity")
      .gte("created_at", da)
      .lt("created_at", a);
    for (const r of data ?? []) somma(r.seller_code, Number(r.quantity));
  } else {
    const { data } = await supabase
      .from("commission_entries")
      .select("beneficiary_code, amount")
      .gte("created_at", da)
      .lt("created_at", a);
    for (const r of data ?? []) somma(r.beneficiary_code, Number(r.amount));
  }

  const righe: Riga[] = [...conti.entries()].map(([codice, c]) => {
    const m = perCodice.get(codice);
    return {
      codice,
      codiceFormattato: formatActivityCode(codice),
      nome: m ? nomeMembro(m) : `Membro ${formatActivityCode(codice)}`,
      quanti: c.quanti,
      totale: Math.round(c.totale * 100) / 100,
    };
  });
  righe.sort((x, y) => x.nome.localeCompare(y.nome, "it"));

  return NextResponse.json({ righe });
}
