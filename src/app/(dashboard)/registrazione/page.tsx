import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, supabaseConfigured } from "@/lib/current-member";
import { PersonalLinkField } from "@/components/personal-link-field";
import { IncaricatoOnlyNotice } from "@/components/incaricato-only-notice";
import { EnrollForm } from "./enroll-form";
import type { Product } from "@/lib/products";

export default async function RegistrazionePage() {
  let slug: string | null = null;
  let isCliente = false;
  let prodotti: Product[] = [];

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

      // Il modello venduto decide gli importi: le provvigioni sono
      // percentuali sull'imponibile del prodotto.
      const { data: righeProdotti } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .order("id");
      prodotti = (righeProdotti ?? []) as Product[];
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Registrazione</h1>
      <p className="text-gray-500 dark:text-gray-400 mt-1">
        Registra un nuovo cliente o incaricato nella rete.
      </p>

      {isCliente ? (
        <div className="mt-6">
          <IncaricatoOnlyNotice />
        </div>
      ) : (
        <>
          {slug && (
            <div className="mt-6 max-w-2xl rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] p-6 shadow-sm">
              <PersonalLinkField slug={slug} />
            </div>
          )}

          <div className="mt-6 max-w-2xl rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] p-6 shadow-sm">
            <EnrollForm products={prodotti} />
          </div>
        </>
      )}
    </div>
  );
}
