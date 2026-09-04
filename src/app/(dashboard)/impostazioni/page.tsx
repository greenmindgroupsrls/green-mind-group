import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export default async function MyProfilePage() {
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

  const { data: profile } = await supabase
    .from("member_profiles")
    .select("*")
    .eq("activity_code", member.activity_code)
    .single();

  const { data: countryRow } = await supabase
    .from("member_countries")
    .select("country")
    .eq("activity_code", member.activity_code)
    .single();

  return (
    <div className="glass-card p-6">
      <h2 className="font-semibold text-gray-900 dark:text-white mb-4">My Profile</h2>
      <ProfileForm
        initial={{
          username: member.username,
          email: member.email ?? "",
          firstName: member.first_name ?? "",
          lastName: member.last_name ?? "",
          accountType: profile?.account_type ?? "individual",
          country: countryRow?.country ?? "",
          dateOfBirth: profile?.date_of_birth ?? "",
          phoneCountryCode: profile?.phone_country_code ?? "",
          phoneNumber: profile?.phone_number ?? "",
          personalDomain: profile?.personal_domain ?? "",
          taxId: profile?.tax_id ?? "",
          companyName: profile?.company_name ?? "",
          sdiCode: profile?.sdi_code ?? "",
          currency: profile?.currency ?? "EUR",
          timezone: profile?.timezone ?? "Europe/Rome",
        }}
      />
    </div>
  );
}
