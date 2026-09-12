import Link from "next/link";
import { FileSignature, FileText, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, supabaseConfigured } from "@/lib/current-member";
import { datiAziendaMancanti } from "@/lib/azienda";
import {
  DOCUMENTO_DESCRIZIONE,
  DOCUMENTO_LABEL,
  STATO_LABEL,
  TIPI_DOCUMENTO,
  type StatoDocumento,
  type TipoDocumento,
} from "@/lib/documenti";

// I DOCUMENTI DA FAR FIRMARE
//
// Da qui l'incaricato apre un modulo nuovo e ritrova quelli gia' fatti.
// L'elenco mostra i propri; l'azienda vede quelli di tutta la rete, e in
// Centro di controllo > Esportazioni li ritrova divisi per mese.

export const dynamic = "force-dynamic";

function dataIt(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const COLORE_STATO: Record<StatoDocumento, string> = {
  bozza: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  firmato: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  annullato: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

export default async function DocumentiPage() {
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
  const { data: righe } = await supabase
    .from("signed_documents")
    .select("id, numero, doc_type, stato, client_name, created_at, signed_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const mancanti = datiAziendaMancanti();

  return (
    <div className="p-4 sm:p-8 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Documenti</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Compila il modulo insieme al cliente, fai firmare sul tablet o dal suo telefono, e il PDF
          firmato resta archiviato qui.
        </p>
      </div>

      {mancanti.length > 0 && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 text-sm px-4 py-3">
          <p className="font-medium">Dati aziendali ancora da completare</p>
          <p className="mt-1">
            Nei documenti generati compariranno come XXXXXXXXX: {mancanti.join(", ")}.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {TIPI_DOCUMENTO.map((tipo: TipoDocumento) => (
          <div key={tipo} className="glass-card p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="shrink-0 h-10 w-10 rounded-lg bg-accent/10 text-accent inline-flex items-center justify-center">
                <FileText size={18} />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {DOCUMENTO_LABEL[tipo]}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {DOCUMENTO_DESCRIZIONE[tipo]}
                </p>
              </div>
            </div>
            <Link
              href={`/documenti/nuovo/${tipo}`}
              className="self-start inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20 transition-colors"
            >
              <Plus size={16} />
              Compila
            </Link>
          </div>
        ))}
      </div>

      <div className="glass-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Documenti recenti</h2>
        {!righe || righe.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 flex items-center gap-2">
            <FileSignature size={15} />
            Nessun documento ancora. Il primo che compili compare qui.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-100 dark:divide-white/5">
            {righe.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/documenti/${r.id}`}
                  className="flex items-center justify-between gap-3 py-3 group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-accent transition-colors">
                      {DOCUMENTO_LABEL[r.doc_type as TipoDocumento]} · {r.client_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                      {r.numero} · {dataIt(r.created_at)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${COLORE_STATO[r.stato as StatoDocumento]}`}
                  >
                    {STATO_LABEL[r.stato as StatoDocumento]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
