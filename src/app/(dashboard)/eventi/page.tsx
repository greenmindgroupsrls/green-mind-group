import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, supabaseConfigured } from "@/lib/current-member";
import type { EventGuest, EventRow } from "@/lib/events";
import { EventiExplorer } from "./eventi-explorer";

export const dynamic = "force-dynamic";

export default async function EventiPage() {
  if (!supabaseConfigured()) {
    return (
      <div className="p-8">
        <p className="rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 text-sm px-4 py-2">
          Supabase non ancora collegato: gli eventi non sono disponibili in modalità demo.
        </p>
      </div>
    );
  }

  const member = await getCurrentMember();
  if (!member || member.activity_code !== 0) {
    redirect("/");
  }

  const supabase = await createClient();
  const [{ data: eventRows }, { data: guestRows }, { data: memberNamesData }] = await Promise.all([
    supabase.from("events").select("*").order("event_date", { ascending: true }),
    supabase.from("event_guests").select("*").order("created_at", { ascending: false }),
    supabase.from("members").select("activity_code, username"),
  ]);

  const events = (eventRows ?? []) as EventRow[];
  const guests = (guestRows ?? []) as EventGuest[];

  const memberNameByCode: Record<number, string> = {};
  for (const m of memberNamesData ?? []) memberNameByCode[m.activity_code] = m.username;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Ospiti — Eventi</h1>
      <p className="text-gray-500 dark:text-gray-400 mt-1">Gestisci eventi e invita i tuoi ospiti</p>
      <div className="mt-6">
        <EventiExplorer
          events={events}
          guests={guests}
          isRoot={true}
          currentMember={{ activity_code: member.activity_code, username: member.username }}
          memberNameByCode={memberNameByCode}
        />
      </div>
    </div>
  );
}
