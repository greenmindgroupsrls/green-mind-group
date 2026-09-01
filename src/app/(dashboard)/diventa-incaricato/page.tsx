import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, supabaseConfigured } from "@/lib/current-member";
import { BecomeForm } from "./become-form";

export default async function DiventaIncaricatoPage() {
  if (!supabaseConfigured()) {
    return (
      <p className="rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 text-sm px-4 py-2 m-8">
        Supabase non ancora collegato: questa sezione non è disponibile in modalità demo.
      </p>
    );
  }

  const member = await getCurrentMember();
  if (!member) redirect("/login");
  if (member.role === "incaricato") redirect("/");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("member_profiles")
    .select("account_type, company_name, tax_id")
    .eq("activity_code", member.activity_code)
    .single();

  return (
    <div className="p-8 max-w-2xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Diventa distributore
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Sblocca l&apos;intero back office: Team, Marketing, Payout e Registrazione.
        </p>
      </div>

      <p className="rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 text-sm px-4 py-2">
        Bozza operativa: prima di renderlo vincolante, fai revisionare questo regolamento da un
        legale.
      </p>

      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] p-6 shadow-sm flex flex-col gap-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">Regolamento Incaricati</h2>
        <ol className="flex flex-col gap-3 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
          <li>
            Da incaricato puoi iscrivere nuovi clienti e incaricati nella tua rete e costruire il
            tuo team.
          </li>
          <li>
            Le commissioni maturano secondo le regole del programma (livelli e rank) descritte nei
            Termini e Condizioni.
          </li>
          <li>
            I tuoi dati fiscali (Codice Fiscale o Partita IVA) restano quelli già forniti in fase
            di registrazione — puoi aggiornarli in qualsiasi momento da Impostazioni.
          </li>
          <li>Puoi richiedere il pagamento delle commissioni maturate dalla sezione Payout.</li>
        </ol>

        {profile && (
          <div className="rounded-lg bg-gray-50 dark:bg-white/5 px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
            <p className="font-medium text-gray-900 dark:text-white mb-1">I tuoi dati</p>
            {profile.account_type === "company" ? (
              <p>
                Azienda — {profile.company_name || "ragione sociale non impostata"}
                {profile.tax_id ? ` · P.IVA ${profile.tax_id}` : ""}
              </p>
            ) : (
              <p>Privato{profile.tax_id ? ` — CF ${profile.tax_id}` : ""}</p>
            )}
          </div>
        )}
      </div>

      <BecomeForm />
    </div>
  );
}
