import { createClient } from "./supabase/server";
import { supabaseConfigured } from "./current-member";

export async function getUnreadMessageCount(activityCode: number): Promise<number> {
  if (!supabaseConfigured()) return 0;

  const supabase = await createClient();
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("recipient_code", activityCode)
    .is("read_at", null);

  return count ?? 0;
}

export type RecentNotification = {
  id: number;
  sender_username: string;
  subject: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

const RECENT_NOTIFICATIONS_LIMIT = 8;

// Alimenta il menu a tendina della campanella: gli stessi messaggi che
// alimentano già /messaggi e il badge "non letti", solo limitati agli
// ultimi N. Non segna nulla come letto qui — lo fa il click sulla
// campanella lato client (vedi AppShell), per non "consumare" la notifica
// solo perché la pagina è stata renderizzata.
export async function getRecentNotifications(activityCode: number): Promise<RecentNotification[]> {
  if (!supabaseConfigured()) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("id, sender_username, subject, body, created_at, read_at")
    .eq("recipient_code", activityCode)
    .order("created_at", { ascending: false })
    .limit(RECENT_NOTIFICATIONS_LIMIT);

  return data ?? [];
}
