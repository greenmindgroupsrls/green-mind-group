import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/current-member";
import { formatActivityCode } from "@/lib/activity-code";
import { confiniMese, meseValido, nomeMembro } from "@/lib/esportazioni";
import { DOCUMENTO_LABEL, STATO_LABEL, type StatoDocumento, type TipoDocumento } from "@/lib/documenti";

// I documenti firmati di un mese, per l'elenco delle esportazioni. Solo
// l'account aziendale: sono contratti con i dati personali dei clienti.

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const chi = await getCurrentMember();
  if (!chi || chi.activity_code !== 0) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const mese = new URL(request.url).searchParams.get("mese");
  if (!meseValido(mese)) {
    return NextResponse.json({ error: "Mese non valido (atteso AAAA-MM)" }, { status: 400 });
  }

  const { da, a } = confiniMese(mese);
  const supabase = await createClient();
  const { data: documenti, error } = await supabase
    .from("signed_documents")
    .select("id, numero, doc_type, stato, client_name, owner_code, created_at, signed_at, pdf_path")
    .gte("created_at", da)
    .lt("created_at", a)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Il nome dell'incaricato al posto del solo codice: l'elenco si legge per
  // sapere chi ha fatto firmare cosa.
  const codici = [...new Set((documenti ?? []).map((d) => d.owner_code))];
  const { data: membri } = codici.length
    ? await supabase
        .from("members")
        .select("activity_code, username, first_name, last_name")
        .in("activity_code", codici)
    : { data: [] as { activity_code: number; username: string; first_name: string | null; last_name: string | null }[] };

  const perCodice = new Map((membri ?? []).map((m) => [m.activity_code, m]));

  return NextResponse.json({
    righe: (documenti ?? []).map((d) => {
      const incaricato = perCodice.get(d.owner_code);
      return {
        id: d.id,
        numero: d.numero,
        tipo: DOCUMENTO_LABEL[d.doc_type as TipoDocumento] ?? d.doc_type,
        stato: STATO_LABEL[d.stato as StatoDocumento] ?? d.stato,
        firmato: d.stato === "firmato",
        cliente: d.client_name,
        incaricato: incaricato
          ? `${formatActivityCode(d.owner_code)} ${nomeMembro(incaricato)}`
          : formatActivityCode(d.owner_code),
        creatoIl: d.created_at,
        firmatoIl: d.signed_at,
        haPdf: !!d.pdf_path,
      };
    }),
  });
}
