import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, supabaseConfigured } from "@/lib/current-member";

export const dynamic = "force-dynamic";

export default async function ContrattoFirmatoPage() {
  if (!supabaseConfigured()) redirect("/");

  const member = await getCurrentMember();
  if (!member) redirect("/login");

  const supabase = await createClient();
  const { data: contract } = await supabase
    .from("incaricato_contracts")
    .select("signed_at")
    .eq("activity_code", member.activity_code)
    .maybeSingle();

  // Chi non ha firmato non ha nulla da vedere qui.
  if (!contract) redirect("/diventa-incaricato");

  const signedAt = contract.signed_at
    ? new Date(contract.signed_at).toLocaleString("it-IT", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="p-8 max-w-2xl mx-auto flex flex-col gap-6">
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 p-6 flex items-start gap-4">
        <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <h1 className="font-semibold text-gray-900 dark:text-white text-lg">
            Contratto firmato
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Sei ora un incaricato alle vendite: Team, Marketing, Payout e Registrazione sono
            sbloccati.
            {signedAt && ` Firmato il ${signedAt}.`}
          </p>
        </div>
      </div>

      <div className="glass-card p-6 flex flex-col gap-4">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">La tua copia</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Conserva il contratto firmato: contiene i tuoi dati, le dichiarazioni e la
            registrazione dell&apos;accettazione.
          </p>
        </div>
        <a
          href="/api/contratto-incaricato"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 self-start glass-btn-primary rounded-lg px-4 py-2.5 text-sm font-medium text-white"
        >
          <Download size={15} />
          Scarica il contratto firmato
        </a>
      </div>

      <Link
        href="/"
        className="self-start text-sm font-medium text-accent hover:underline"
      >
        Vai alla dashboard
      </Link>
    </div>
  );
}
