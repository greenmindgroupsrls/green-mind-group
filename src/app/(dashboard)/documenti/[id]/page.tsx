import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, supabaseConfigured } from "@/lib/current-member";
import {
  DOCUMENTO_LABEL,
  FIRME_RICHIESTE,
  STATO_LABEL,
  euro,
  type RuoloFirma,
  type StatoDocumento,
  type TipoDocumento,
} from "@/lib/documenti";
import { CAMPI_DOCUMENTO, campoVisibile, valoreLeggibile } from "@/lib/documento-campi";
import { calcolaTotale } from "@/lib/documento-blocchi";
import { dataOraIt } from "@/lib/documento-pdf";
import { DocumentoAzioni } from "../documento-azioni";

export const dynamic = "force-dynamic";

export default async function DocumentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const documentId = Number(id);
  if (!Number.isInteger(documentId)) notFound();

  if (!supabaseConfigured()) {
    return (
      <div className="p-4 sm:p-8">
        <p className="rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 text-sm px-4 py-2">
          Supabase non ancora collegato: i documenti non sono disponibili in modalità demo.
        </p>
      </div>
    );
  }

  const membro = await getCurrentMember();
  if (!membro) return null;

  const supabase = await createClient();
  const { data: documento } = await supabase
    .from("signed_documents")
    .select("id, numero, doc_type, stato, dati, client_name, client_email, created_at, pdf_sha256")
    .eq("id", documentId)
    .maybeSingle();

  // Le regole del database non restituiscono i documenti di altri: qui
  // "non trovato" e "non tuo" finiscono giustamente nello stesso posto.
  if (!documento) notFound();

  const { data: firme } = await supabase
    .from("document_signatures")
    .select("ruolo, firmatario, signed_at, metodo")
    .eq("document_id", documentId);

  const tipo = documento.doc_type as TipoDocumento;
  const stato = documento.stato as StatoDocumento;
  const dati = (documento.dati ?? {}) as Record<string, string | boolean>;

  const valori: Record<string, string> = {};
  for (const [k, v] of Object.entries(dati)) valori[k] = typeof v === "string" ? v : String(v ?? "");

  const { data: anagrafica } = await supabase
    .from("members")
    .select("first_name, last_name")
    .eq("activity_code", membro.activity_code)
    .maybeSingle();
  const nomeIncaricato =
    [anagrafica?.first_name, anagrafica?.last_name].filter(Boolean).join(" ").trim() ||
    membro.username;

  const conto = tipo === "contratto_vendita" ? calcolaTotale(dati) : null;

  return (
    <div className="p-4 sm:p-8 flex flex-col gap-6 max-w-4xl">
      <div>
        <Link
          href="/documenti"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-accent transition-colors"
        >
          <ArrowLeft size={15} />
          Documenti
        </Link>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {DOCUMENTO_LABEL[tipo]}
          </h1>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-500/10 text-gray-600 dark:text-gray-300">
            {STATO_LABEL[stato]}
          </span>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          {documento.numero} · {documento.client_name} · creato il {dataOraIt(documento.created_at)}
        </p>
      </div>

      <DocumentoAzioni
        documentId={documento.id}
        tipo={tipo}
        stato={stato}
        clienteNome={documento.client_name}
        clienteEmail={documento.client_email}
        ruoliRichiesti={FIRME_RICHIESTE[tipo] as RuoloFirma[]}
        firme={(firme ?? []).map((f) => ({
          ruolo: f.ruolo as RuoloFirma,
          firmatario: f.firmatario,
          firmatoIl: dataOraIt(f.signed_at),
          metodo: f.metodo,
        }))}
        nomeIncaricato={nomeIncaricato}
      />

      {conto && (
        <div className="glass-card p-4 sm:p-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Totale del contratto</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {conto.prodotto?.nome ?? "Versione non indicata"}
              {conto.consegna ? ` + consegna ${euro(conto.consegna)}` : ""}
              {conto.installazione ? ` + installazione ${euro(conto.installazione)}` : ""}
            </p>
          </div>
          <p className="text-xl font-semibold text-gray-900 dark:text-white tabular-nums">
            {euro(conto.totale)}
          </p>
        </div>
      )}

      {CAMPI_DOCUMENTO[tipo].map((sezione) => {
        const visibili = sezione.campi.filter((c) => campoVisibile(c, valori));
        if (visibili.length === 0) return null;
        return (
          <div key={sezione.titolo} className="glass-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{sezione.titolo}</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-3">
              {visibili.map((c) => (
                <div key={c.nome} className={c.intera ? "sm:col-span-2" : ""}>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">{c.label}</dt>
                  <dd className="text-sm text-gray-900 dark:text-white mt-0.5">
                    {valoreLeggibile(c, dati[c.nome])}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}

      {documento.pdf_sha256 && (
        <div className="glass-card p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldCheck size={16} className="text-accent" />
            Impronta del documento archiviato
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Se il PDF venisse modificato dopo la firma, questa impronta non corrisponderebbe più.
          </p>
          <p className="text-xs font-mono break-all text-gray-700 dark:text-gray-300 mt-2">
            {documento.pdf_sha256}
          </p>
        </div>
      )}
    </div>
  );
}
