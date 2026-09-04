import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, supabaseConfigured } from "@/lib/current-member";
import { PersonalLinkField } from "@/components/personal-link-field";
import { IncaricatoOnlyNotice } from "@/components/incaricato-only-notice";
import { EnrollForm } from "./enroll-form";

export default async function RegistrazionePage() {
  let slug: string | null = null;
  let isCliente = false;

  if (supabaseConfigured()) {
    const member = await getCurrentMember();
    if (member) {
      isCliente = member.role === "cliente";
      const supabase = await createClient();
      const { data: profile } = await supabase
        .from("member_profiles")
        .select("personal_domain")
        .eq("activity_code", member.activity_code)
        .single();
      slug = profile?.personal_domain || member.username;
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Registrazione</h1>
      <p className="text-gray-600 dark:text-gray-300 mt-1">
        Registra un nuovo cliente o incaricato nella rete.
      </p>

      {isCliente ? (
        <div className="mt-6">
          <IncaricatoOnlyNotice />
        </div>
      ) : (
        <>
          {slug && (
            <div className="mt-6 max-w-2xl glass-card p-6">
              <PersonalLinkField slug={slug} />
            </div>
          )}

          <div className="mt-6 max-w-2xl glass-card p-6">
            <EnrollForm />
          </div>
        </>
      )}
    </div>
  );
}
