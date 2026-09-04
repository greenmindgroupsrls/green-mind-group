import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, supabaseConfigured } from "@/lib/current-member";
import { withEffectiveStatus, type Task, type Contact } from "@/lib/crm";
import { TaskForm } from "./task-form";
import { AgendaExplorer } from "./agenda-explorer";

export default async function AgendaPage() {
  if (!supabaseConfigured()) {
    return (
      <p className="rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 text-sm px-4 py-2">
        Supabase non ancora collegato: l&apos;agenda non è disponibile in modalità demo.
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
  const [{ data: tasks }, { data: contacts }] = await Promise.all([
    supabase.from("crm_tasks").select("*").order("due_at", { ascending: true }),
    supabase.from("crm_contacts").select("*").order("name", { ascending: true }),
  ]);

  const taskRows = (tasks ?? []) as Task[];
  const contactRows = withEffectiveStatus((contacts ?? []) as Contact[], taskRows);

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card p-6">
        <TaskForm contacts={contactRows} />
      </div>

      <AgendaExplorer tasks={taskRows} contacts={contactRows} />
    </div>
  );
}
