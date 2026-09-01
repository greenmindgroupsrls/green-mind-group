import { redirect } from "next/navigation";
import { getAuthState, supabaseConfigured } from "@/lib/current-member";
import { getUnreadMessageCount, getRecentNotifications } from "@/lib/notifications";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const { isAuthenticated, member } = await getAuthState();

  if (supabaseConfigured() && isAuthenticated && !member) {
    redirect("/registrati/completa");
  }

  if (member?.suspended) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login?suspended=1");
  }

  const [unreadCount, notifications] = member
    ? await Promise.all([
        getUnreadMessageCount(member.activity_code),
        getRecentNotifications(member.activity_code),
      ])
    : [0, []];

  return (
    <AppShell currentMember={member} unreadCount={unreadCount} notifications={notifications}>
      {children}
    </AppShell>
  );
}
