import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, supabaseConfigured } from "@/lib/current-member";
import { formatActivityCode } from "@/lib/activity-code";
import { ContractForm } from "./contract-form";
import { CONTRACT_VERSION } from "@/lib/contract-version";

export const dynamic = "force-dynamic";

function itDate(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

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

  const supabase = await createClient();

  // Il discrimine e' il contratto, non il ruolo: gli incaricati attivati
  // prima che questa funzione esistesse devono poterlo firmare comunque.
  // Chi lo ha gia' firmato va invece alla propria copia.
  const { data: existingContract } = await supabase
    .from("incaricato_contracts")
    .select("id")
    .eq("activity_code", member.activity_code)
    .maybeSingle();
  if (existingContract) redirect("/diventa-incaricato/fatto");

  const alreadyIncaricato = member.role === "incaricato";
  const [{ data: row }, { data: profile }, { data: address }, { data: vatCert }] =
    await Promise.all([
    supabase
      .from("members")
      .select("first_name, last_name, email, ref_sponsor_code")
      .eq("activity_code", member.activity_code)
      .single(),
    supabase
      .from("member_profiles")
      .select("date_of_birth, phone_country_code, phone_number, tax_id, company_name, account_type")
      .eq("activity_code", member.activity_code)
      .maybeSingle(),
    supabase
      .from("member_addresses")
      .select("street, city, postal_code, region, country")
      .eq("activity_code", member.activity_code)
      .limit(1)
      .maybeSingle(),
    // Se il certificato e' gia' stato caricato in Impostazioni non lo si
    // richiede una seconda volta.
    supabase
      .from("member_kyc_documents")
      .select("id")
      .eq("activity_code", member.activity_code)
      .eq("doc_type", "vat_certificate")
      .maybeSingle(),
  ]);

  let sponsor = "—";
  if (row?.ref_sponsor_code !== null && row?.ref_sponsor_code !== undefined) {
    const { data: s } = await supabase
      .from("members")
      .select("username")
      .eq("activity_code", row.ref_sponsor_code)
      .maybeSingle();
    sponsor = `${formatActivityCode(row.ref_sponsor_code)}${s?.username ? ` ${s.username}` : ""}`;
  }

  const known = [
    { label: "Codice incaricato", value: formatActivityCode(member.activity_code) },
    { label: "Nome e cognome", value: `${row?.first_name ?? ""} ${row?.last_name ?? ""}`.trim() },
    { label: "Email", value: row?.email ?? "" },
    {
      label: "Telefono",
      value: [profile?.phone_country_code, profile?.phone_number].filter(Boolean).join(" "),
    },
    {
      label: profile?.account_type === "company" ? "Partita IVA" : "Codice fiscale",
      value: profile?.tax_id ?? "",
    },
    { label: "Data di nascita", value: itDate(profile?.date_of_birth) },
    {
      label: "Indirizzo",
      value: address
        ? [address.street, address.postal_code, address.city, address.region, address.country]
            .filter(Boolean)
            .join(", ")
        : "",
    },
    { label: "Sponsor", value: sponsor },
  ];

  const missing = known.filter((k) => !k.value).map((k) => k.label);

  return (
    <div className="p-8 max-w-3xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {alreadyIncaricato
            ? "Completa il tuo contratto da incaricato"
            : "Diventa incaricato alle vendite"}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {alreadyIncaricato
            ? "Sei già operativo come incaricato, ma il tuo contratto non risulta ancora firmato. Compilalo, generalo e firmalo per mettere in regola la tua posizione."
            : "Compila il contratto, generalo e firmalo per sbloccare Team, Marketing, Payout e Registrazione."}
        </p>
      </div>

      {missing.length > 0 && (
        <p className="rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 text-sm px-4 py-3">
          Nel contratto resteranno vuoti questi dati, che non sono ancora nel tuo profilo:{" "}
          <strong>{missing.join(", ")}</strong>. Puoi completarli in Impostazioni e tornare qui.
        </p>
      )}

      <ContractForm
        contractVersion={CONTRACT_VERSION}
        known={known}
        activityCode={member.activity_code}
        vatCertificateUploaded={Boolean(vatCert)}
        alreadyIncaricato={alreadyIncaricato}
      />
    </div>
  );
}
