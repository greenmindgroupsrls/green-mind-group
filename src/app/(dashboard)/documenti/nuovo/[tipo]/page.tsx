import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, supabaseConfigured } from "@/lib/current-member";
import { DOCUMENTO_DESCRIZIONE, DOCUMENTO_LABEL, tipoDocumentoValido } from "@/lib/documenti";
import { ModuloForm } from "./modulo-form";

export const dynamic = "force-dynamic";

export default async function NuovoDocumentoPage({
  params,
}: {
  params: Promise<{ tipo: string }>;
}) {
  const { tipo } = await params;
  if (!tipoDocumentoValido(tipo)) notFound();

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

  // Il nome dell'incaricato lo sappiamo gia': chiederglielo di nuovo a ogni
  // contratto e' una domanda a cui il sistema sa rispondere da solo.
  const supabase = await createClient();
  const { data: anagrafica } = await supabase
    .from("members")
    .select("first_name, last_name")
    .eq("activity_code", membro.activity_code)
    .maybeSingle();

  const nomeIncaricato =
    [anagrafica?.first_name, anagrafica?.last_name].filter(Boolean).join(" ").trim() ||
    membro.username;

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
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mt-2">
          {DOCUMENTO_LABEL[tipo]}
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">{DOCUMENTO_DESCRIZIONE[tipo]}</p>
      </div>

      <ModuloForm tipo={tipo} valoriIniziali={{ incaricato_nome: nomeIncaricato }} />
    </div>
  );
}
