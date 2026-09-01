import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/current-member";
import { formatActivityCode } from "@/lib/activity-code";
import { MessageForm } from "./message-form";

type MessageRow = {
  id: number;
  sender_code: number;
  sender_username: string;
  recipient_code: number;
  recipient_username: string;
  subject: string;
  body: string;
  created_at: string;
};

export default async function MessaggiPage() {
  if (!supabaseConfigured()) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Messaggi</h1>
        <p className="text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-lg px-3 py-2 mt-4 max-w-lg">
          Supabase non ancora collegato: i messaggi non sono disponibili in modalità demo.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("members")
    .select("activity_code")
    .eq("auth_user_id", user.id)
    .single();

  if (!member) redirect("/registrati/completa");

  // Idempotente (aggiorna solo read_at is null): sicuro chiamarlo ad ogni
  // visita della pagina, anche più volte, per azzerare il badge notifiche.
  await supabase.rpc("mark_messages_read");

  const { data: messages } = await supabase
    .from("messages")
    .select(
      "id, sender_code, sender_username, recipient_code, recipient_username, subject, body, created_at",
    )
    .order("created_at", { ascending: false });

  const rows = (messages ?? []) as MessageRow[];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Messaggi</h1>
      <p className="text-gray-500 dark:text-gray-400 mt-1">Contatta un altro membro della rete.</p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6 mt-6">
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] p-6 shadow-sm h-fit">
          <MessageForm />
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] p-3 shadow-sm">
          {rows.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-12">
              Nessun messaggio.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-gray-100 dark:divide-white/5">
              {rows.map((m) => {
                const outgoing = m.sender_code === member.activity_code;
                return (
                  <li key={m.id} className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {outgoing
                          ? `A: ${m.recipient_username} (${formatActivityCode(m.recipient_code)})`
                          : `Da: ${m.sender_username} (${formatActivityCode(m.sender_code)})`}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                        {new Date(m.created_at).toLocaleString("it-IT", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                      {m.subject}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5 whitespace-pre-wrap">
                      {m.body}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
