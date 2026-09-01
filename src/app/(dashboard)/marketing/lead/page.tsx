import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, supabaseConfigured } from "@/lib/current-member";
import { LeadRowActions } from "./lead-row-actions";
import { LeadAssignAction } from "./lead-assign-action";
import { LeadViewSwitch } from "./lead-view-switch";
import type { CalendarLead } from "./lead-calendar";

export const dynamic = "force-dynamic";

type LeadRow = {
  id: number;
  source: string;
  name: string;
  phone: string;
  email: string;
  address: string | null;
  notes: string | null;
  requested_date: string | null;
  requested_time: string | null;
  status: string;
  internal_notes: string | null;
  assigned_to: number | null;
  assigned_at: string | null;
  appointment_at: string | null;
  created_at: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function LeadPage() {
  if (!supabaseConfigured()) {
    return (
      <p className="rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 text-sm px-4 py-2">
        Supabase non ancora collegato: i lead non sono disponibili in modalità demo.
      </p>
    );
  }

  const member = await getCurrentMember();
  if (!member || member.activity_code !== 0) {
    redirect("/marketing");
  }

  const supabase = await createClient();
  const [{ data }, { data: memberRows }] = await Promise.all([
    supabase.from("leads").select("*").order("created_at", { ascending: false }),
    supabase
      .from("members")
      .select("activity_code, username")
      .eq("role", "incaricato")
      .neq("activity_code", 0)
      .order("username", { ascending: true }),
  ]);
  const leads = (data ?? []) as LeadRow[];
  const members = memberRows ?? [];
  const usernameByCode = new Map(members.map((m) => [m.activity_code, m.username]));

  const calendarLeads: CalendarLead[] = leads.map((l) => ({
    id: l.id,
    name: l.name,
    phone: l.phone,
    email: l.email,
    address: l.address,
    notes: l.notes,
    status: l.status,
    requestedDate: l.requested_date,
    requestedTime: l.requested_time,
    appointmentAt: l.appointment_at,
    assignedTo: l.assigned_to ? (usernameByCode.get(l.assigned_to) ?? null) : null,
  }));

  const tabella = (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
              <th className="px-6 py-2 font-medium">Contatto</th>
              <th className="px-6 py-2 font-medium">Richiesta</th>
              <th className="px-6 py-2 font-medium">Note dal cliente</th>
              <th className="px-6 py-2 font-medium">Ricevuto</th>
              <th className="px-6 py-2 font-medium">Stato</th>
              <th className="px-6 py-2 font-medium">Inoltra</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className="border-t border-gray-100 dark:border-white/5 align-top">
                <td className="px-6 py-3">
                  <p className="font-medium text-gray-900 dark:text-white">{l.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{l.phone}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{l.email}</p>
                  {l.address && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">{l.address}</p>
                  )}
                </td>
                <td className="px-6 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {l.requested_date ? formatDate(l.requested_date) : "—"}
                  {l.requested_time ? ` · ${l.requested_time}` : ""}
                </td>
                <td className="px-6 py-3 text-gray-500 dark:text-gray-400 max-w-[220px]">
                  {l.notes || "—"}
                </td>
                <td className="px-6 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {formatDate(l.created_at)}
                </td>
                <td className="px-6 py-3">
                  <LeadRowActions id={l.id} status={l.status} internalNotes={l.internal_notes} />
                </td>
                <td className="px-6 py-3">
                  <LeadAssignAction
                    id={l.id}
                    members={members}
                    assignedToUsername={l.assigned_to ? (usernameByCode.get(l.assigned_to) ?? null) : null}
                    assignedAt={l.assigned_at}
                  />
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400 dark:text-gray-500">
                  Nessun lead ricevuto finora.
                </td>
              </tr>
            )}
          </tbody>
        </table>
    </div>
  );

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10">
        <h2 className="font-semibold text-gray-900 dark:text-white">Lead</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Richieste di contatto arrivate dai siti collegati (es. Vortix)
        </p>
      </div>
      <LeadViewSwitch tabella={tabella} leads={calendarLeads} />
    </div>
  );
}
