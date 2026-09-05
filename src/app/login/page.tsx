import { getDizionario } from "@/i18n/dizionario";
import { AuthTabs } from "./auth-tabs";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const t = (await getDizionario()).accesso;
  const nextParam = params.next;
  const next = typeof nextParam === "string" ? nextParam : "/";
  const suspended = params.suspended === "1";

  const supabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="h-9 w-9 rounded-lg bg-[var(--accent)] flex items-center justify-center text-[var(--accent-fg)] font-bold">
            G
          </div>
          <span className="font-semibold text-lg text-gray-900 dark:text-white">
            Green Mind Group
          </span>
        </div>

        <div className="glass-card p-6">
          {suspended && (
            <p className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2 mb-4">
              {t.accountSospeso}
            </p>
          )}
          {supabaseConfigured ? (
            <AuthTabs next={next} t={t} />
          ) : (
            <>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{t.accedi}</h1>
              <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-lg px-3 py-2 mt-4">
                {t.nonCollegato}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
