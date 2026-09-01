import Link from "next/link";
import { FileWarning } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/current-member";

// Gli incaricati attivati prima che il contratto online esistesse non hanno
// un contratto firmato agli atti. Non lo scoprirebbero mai da soli: la
// pagina di firma non e' in nessun menu, quindi l'avviso deve raggiungerli
// dove guardano ogni giorno.
export async function ContractReminder({ activityCode }: { activityCode: number }) {
  if (!supabaseConfigured()) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("incaricato_contracts")
    .select("id")
    .eq("activity_code", activityCode)
    .maybeSingle();

  if (data) return null;

  return (
    <div className="mx-8 mt-6 rounded-xl border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <FileWarning size={20} className="text-amber-600 dark:text-amber-400 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-900 dark:text-amber-300">
          Contratto da incaricato non ancora firmato
        </p>
        <p className="text-sm text-amber-800/80 dark:text-amber-400/80 mt-0.5">
          Compilalo e firmalo per mettere in regola la tua posizione: bastano pochi minuti.
        </p>
      </div>
      <Link
        href="/diventa-incaricato"
        className="shrink-0 rounded-lg bg-amber-600 dark:bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
      >
        Compila il contratto
      </Link>
    </div>
  );
}
