import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Solo server-side: usa la service role key per creare utenti Auth per conto
// di chi sponsorizza un nuovo iscritto, senza toccare la sessione corrente.
// Non importare mai questo file da un componente client.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase admin client non configurato (URL o service role key mancanti)");
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
