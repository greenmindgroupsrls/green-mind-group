import { createClient } from "./supabase/server";

export type MemberRole = "cliente" | "incaricato";

export type CurrentMember = {
  activity_code: number;
  username: string;
  avatar_url: string | null;
  role: MemberRole;
  suspended: boolean;
};

export function supabaseConfigured() {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

// isAuthenticated=true + member=null significa: sessione valida ma nessuna
// riga in members ancora collegata (registrazione da completare).
export async function getAuthState(): Promise<{
  isAuthenticated: boolean;
  member: CurrentMember | null;
}> {
  if (!supabaseConfigured()) return { isAuthenticated: false, member: null };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { isAuthenticated: false, member: null };

  const { data } = await supabase
    .from("members")
    .select("activity_code, username, role, suspended")
    .eq("auth_user_id", user.id)
    .single();

  if (!data) return { isAuthenticated: true, member: null };

  const { data: avatar } = await supabase
    .from("member_avatars")
    .select("avatar_url")
    .eq("activity_code", data.activity_code)
    .single();

  return {
    isAuthenticated: true,
    member: { ...data, role: data.role as MemberRole, avatar_url: avatar?.avatar_url ?? null },
  };
}

export async function getCurrentMember(): Promise<CurrentMember | null> {
  const { member } = await getAuthState();
  return member;
}
