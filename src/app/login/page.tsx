import { AuthTabs } from "./auth-tabs";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const nextParam = params.next;
  const next = typeof nextParam === "string" ? nextParam : "/";
  const suspended = params.suspended === "1";

  const supabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center text-white font-bold">
            G
          </div>
          <span className="font-semibold text-lg text-gray-900 dark:text-white">
            Green Mind Group
          </span>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] p-6 shadow-sm">
          {suspended && (
            <p className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2 mb-4">
              Il tuo account è stato sospeso. Contatta l&apos;azienda per maggiori informazioni.
            </p>
          )}
          {supabaseConfigured ? (
            <AuthTabs next={next} />
          ) : (
            <>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Accedi</h1>
              <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-lg px-3 py-2 mt-4">
                Supabase non ancora collegato: il login non è disponibile finché il progetto non
                è configurato.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
