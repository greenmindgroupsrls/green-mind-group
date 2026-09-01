import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, supabaseConfigured } from "@/lib/current-member";
import type { EventRow } from "@/lib/events";
import { MarketingEventsList } from "./marketing-events-list";

export const dynamic = "force-dynamic";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default async function MarketingEventiPage() {
  if (!supabaseConfigured()) {
    return (
      <p className="rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 text-sm px-4 py-2">
        Supabase non ancora collegato: gli eventi non sono disponibili in modalità demo.
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
  const { data: eventRows } = await supabase
    .from("events")
    .select("*")
    .gte("event_date", todayIso())
    .order("event_date", { ascending: true });

  const events = (eventRows ?? []) as EventRow[];

  return (
    <MarketingEventsList
      events={events}
      currentMember={{ activity_code: member.activity_code, username: member.username }}
    />
  );
}
