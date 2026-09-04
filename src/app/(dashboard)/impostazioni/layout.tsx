import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/current-member";
import { RANK_LABEL, type Rank } from "@/lib/rank";
import { AvatarUpload } from "./avatar-upload";
import { SettingsNav } from "./settings-nav";

export default async function ImpostazioniLayout({ children }: LayoutProps<"/impostazioni">) {
  if (!supabaseConfigured()) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Impostazioni</h1>
        <p className="text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-lg px-3 py-2 mt-4 max-w-lg">
          Supabase non ancora collegato: le impostazioni non sono disponibili in modalità demo.
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
    .select("activity_code, username, first_name, last_name, email")
    .eq("auth_user_id", user.id)
    .single();

  if (!member) redirect("/registrati/completa");

  const { data: rankRow } = await supabase
    .from("member_ranks")
    .select("rank")
    .eq("activity_code", member.activity_code)
    .single();
  const rank = (rankRow?.rank ?? "standard") as Rank;

  const { data: avatar } = await supabase
    .from("member_avatars")
    .select("avatar_url")
    .eq("activity_code", member.activity_code)
    .single();

  const displayName =
    member.first_name && member.last_name
      ? `${member.first_name} ${member.last_name}`
      : member.username;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Impostazioni</h1>
      <p className="text-gray-600 dark:text-gray-300 mt-1">Il tuo profilo, documenti e sicurezza</p>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 mt-6">
        <div className="flex flex-col gap-4">
          <div className="glass-card p-6 flex flex-col items-center text-center">
            <AvatarUpload
              activityCode={member.activity_code}
              username={member.username}
              avatarUrl={avatar?.avatar_url ?? null}
            />
            <p className="font-semibold text-gray-900 dark:text-white mt-3">{displayName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
            <span className="text-xs font-medium rounded-full px-2.5 py-1 bg-accent/10 text-accent mt-3">
              {RANK_LABEL[rank]}
            </span>
          </div>

          <div className="glass-card p-3">
            <SettingsNav />
          </div>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}
