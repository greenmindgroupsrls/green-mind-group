import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AboutForm } from "./about-form";

function stripPrefix(url: string | null, prefix: string): string {
  if (!url) return "";
  return url.startsWith(prefix) ? url.slice(prefix.length) : url;
}

export default async function AboutMePage() {
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

  const { data: profile } = await supabase
    .from("member_profiles")
    .select("about, linkedin_url, facebook_url, instagram_url")
    .eq("activity_code", member.activity_code)
    .single();

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] p-6 shadow-sm">
      <h2 className="font-semibold text-gray-900 dark:text-white mb-1">About Me</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Informazioni aggiuntive per la tua pagina di presentazione
      </p>
      <AboutForm
        about={profile?.about ?? ""}
        linkedin={stripPrefix(profile?.linkedin_url ?? null, "https://linkedin.com/")}
        facebook={stripPrefix(profile?.facebook_url ?? null, "https://facebook.com/")}
        instagram={stripPrefix(profile?.instagram_url ?? null, "https://instagram.com/")}
      />
    </div>
  );
}
