import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client "silenzioso" (nessun cookie, nessuna sessione persistita) che agisce
// per conto di un utente specifico passando il suo access token già ottenuto
// altrove — serve dentro funzioni cache-abili (unstable_cache), dove non è
// possibile leggere i cookie della richiesta corrente. La RLS si applica
// esattamente come con il client SSR normale: Postgres legge auth.uid() dal
// JWT nell'header Authorization, non da come è arrivato alla richiesta.
export function createTokenScopedClient(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createSupabaseClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
