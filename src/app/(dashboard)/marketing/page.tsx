import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, supabaseConfigured } from "@/lib/current-member";
import { MarketingContent } from "./marketing-content";

export default async function MarketingPage() {
  if (!supabaseConfigured()) {
    return (
      <p className="rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 text-sm px-4 py-2">
        Supabase non ancora collegato: i materiali marketing non sono disponibili in modalità
        demo.
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
  const { data: profile } = await supabase
    .from("member_profiles")
    .select("personal_domain")
    .eq("activity_code", member.activity_code)
    .single();

  // Il link personale è assegnato in automatico allo username all'iscrizione
  // (trigger ensure_member_profile): profile?.personal_domain dovrebbe
  // sempre esserci. Fallback difensivo allo username stesso, giusto per non
  // lasciare la pagina rotta nel caso limite in cui manchi.
  const slug = profile?.personal_domain || member.username;

  const { data: scriptRows } = await supabase
    .from("marketing_call_scripts")
    .select("id, label, body")
    .order("sort_order", { ascending: true });

  return (
    <MarketingContent
      slug={slug}
      name={member.username}
      scripts={scriptRows ?? []}
      isRoot={member.activity_code === 0}
    />
  );
}
