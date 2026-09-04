import Link from "next/link";
import { CheckCircle2, Circle, GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, supabaseConfigured } from "@/lib/current-member";

type ChecklistItem = {
  label: string;
  done: boolean;
  href: string;
  cta: string;
};

export default async function SupportAcademyPage() {
  if (!supabaseConfigured()) {
    return (
      <p className="rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 text-sm px-4 py-2">
        Supabase non ancora collegato: il percorso di avvio non è disponibile in modalità demo.
      </p>
    );
  }

  const member = await getCurrentMember();
  if (!member) {
    return (
      <p className="rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 text-sm px-4 py-2">
        Devi essere autenticato per vedere questa pagina.
      </p>
    );
  }

  const supabase = await createClient();
  const [{ data: profile }, { data: country }, { data: ownSale }, { data: referral }, { data: kyc }] =
    await Promise.all([
      supabase
        .from("member_profiles")
        .select("phone_number")
        .eq("activity_code", member.activity_code)
        .maybeSingle(),
      supabase
        .from("member_countries")
        .select("country")
        .eq("activity_code", member.activity_code)
        .maybeSingle(),
      supabase
        .from("commission_entries")
        .select("id")
        .eq("beneficiary_code", member.activity_code)
        .eq("level", 0)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("members")
        .select("activity_code")
        .eq("ref_sponsor_code", member.activity_code)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("member_kyc_documents")
        .select("id")
        .eq("activity_code", member.activity_code)
        .limit(1)
        .maybeSingle(),
    ]);

  const items: ChecklistItem[] = [
    {
      label: "Completa il tuo profilo (telefono e paese)",
      done: !!profile?.phone_number && !!country?.country,
      href: "/impostazioni",
      cta: "Vai al profilo",
    },
    {
      label: "Carica un documento KYC",
      done: !!kyc,
      href: "/impostazioni/documenti",
      cta: "Carica documento",
    },
    {
      label: "Registra la tua prima vendita",
      done: !!ownSale,
      href: "/registrazione",
      cta: "Vai a Registrazione",
    },
    {
      label: "Invita il tuo primo iscritto",
      done: !!referral,
      href: "/marketing",
      cta: "Vai a Marketing",
    },
  ];

  const doneCount = items.filter((i) => i.done).length;

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
          <GraduationCap size={20} />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">Il tuo percorso di avvio</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {doneCount}/{items.length} completati
          </p>
        </div>
      </div>

      <div className="h-1.5 bg-gray-100 dark:bg-white/5">
        <div
          className="h-full bg-accent transition-all"
          style={{ width: `${(doneCount / items.length) * 100}%` }}
        />
      </div>

      <div className="flex flex-col divide-y divide-gray-100 dark:divide-white/5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 px-6 py-4">
            <div className="flex items-center gap-3">
              {item.done ? (
                <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
              ) : (
                <Circle size={20} className="text-gray-300 dark:text-gray-600 shrink-0" />
              )}
              <span
                className={`text-sm ${item.done ? "text-gray-500 dark:text-gray-400 line-through" : "text-gray-900 dark:text-white font-medium"}`}
              >
                {item.label}
              </span>
            </div>
            {!item.done && (
              <Link href={item.href} className="text-xs font-medium text-accent hover:underline shrink-0">
                {item.cta}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
