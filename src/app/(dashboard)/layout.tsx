import { redirect } from "next/navigation";
import { getAuthState, supabaseConfigured } from "@/lib/current-member";
import { getUnreadMessageCount, getRecentNotifications, contaNuoviOrdini } from "@/lib/notifications";
import { AppShell } from "@/components/app-shell";
import { getDizionario, linguaCorrente } from "@/i18n/dizionario";
import { createClient } from "@/lib/supabase/server";
import { TestiProvider } from "@/i18n/testi-client";

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

  const lingua = await linguaCorrente();
  const testi = await getDizionario(lingua);

  const [unreadCount, notifications, nuoviOrdini] = member
    ? await Promise.all([
        getUnreadMessageCount(member.activity_code),
        getRecentNotifications(member.activity_code),
        contaNuoviOrdini(member.activity_code),
      ])
    : [0, [], 0];

  return (
    <TestiProvider testi={testi} lingua={lingua}>
      <AppShell
        currentMember={member}
        unreadCount={unreadCount}
        nuoviOrdini={nuoviOrdini}
        notifications={notifications}
        testi={testi}
        lingua={lingua}
      >
        {children}
      </AppShell>
    </TestiProvider>
  );
}
