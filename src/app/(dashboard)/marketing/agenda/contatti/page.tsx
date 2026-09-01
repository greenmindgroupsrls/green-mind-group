import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, supabaseConfigured } from "@/lib/current-member";
import { withEffectiveStatus, type Contact, type Task } from "@/lib/crm";
import { ContactForm } from "./contact-form";
import { ContactsExplorer } from "./contacts-explorer";

export default async function ContattiPage() {
  if (!supabaseConfigured()) {
    return (
      <p className="rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 text-sm px-4 py-2">
        Supabase non ancora collegato: i contatti non sono disponibili in modalità demo.
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
  const [{ data: contactData }, { data: taskData }, { data: memberData }] = await Promise.all([
    supabase.from("crm_contacts").select("*").order("created_at", { ascending: false }),
    supabase.from("crm_tasks").select("*"),
    supabase.from("members").select("activity_code, username").order("username", { ascending: true }),
  ]);

  const contacts = withEffectiveStatus((contactData ?? []) as Contact[], (taskData ?? []) as Task[]);
  const members = memberData ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <ContactForm />
      </div>

      <ContactsExplorer contacts={contacts} members={members} />
    </div>
  );
}
