import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/current-member";
import { SignupForm } from "@/app/login/signup-form";
import { GoogleButton } from "@/components/google-button";
import { getDizionario } from "@/i18n/dizionario";

// Sempre la vera schermata di registrazione, anche per chi la apre già
// loggato (es. root che vuole controllare/condividere il proprio link) —
// vedi proxy.ts, che lascia passare /r/ apposta senza reindirizzare via
// chi ha già una sessione.
export default async function ReferralLinkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const configured = supabaseConfigured();
  let sponsor: { activity_code: number; username: string } | null = null;

  if (configured) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("resolve_referral_link", { p_slug: slug }).maybeSingle();
    sponsor = (data as { activity_code: number; username: string } | null) ?? null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center text-white font-bold">
            G
          </div>
          <span className="font-semibold text-lg text-gray-900 dark:text-white">
            Green Mind Group
          </span>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] p-6 shadow-sm">
          {!configured ? (
            <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-lg px-3 py-2">
              Supabase non ancora collegato: la registrazione non è disponibile in modalità demo.
            </p>
          ) : !sponsor ? (
            <>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Link non valido
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Questo link di invito non esiste più o è stato scritto in modo errato.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Registrati
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Sei stato invitato da <strong>{sponsor.username}</strong>. Completa la
                registrazione per entrare nella rete.
              </p>

              <SignupForm t={(await getDizionario()).accesso} lockedRef={{ code: sponsor.activity_code, username: sponsor.username }} />

              <div className="flex items-center gap-3 my-5">
                <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
                <span className="text-xs text-gray-400 dark:text-gray-500">oppure</span>
                <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
              </div>

              <GoogleButton
                label="Registrati con Google"
                refCode={sponsor.activity_code}
                refUsername={sponsor.username}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
