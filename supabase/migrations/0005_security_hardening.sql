-- Corregge i finding del linter di sicurezza Supabase dopo le migration precedenti.
--
-- 1) member_ranks era una vista "security definer" di fatto (bypassava la RLS
--    di members per chiunque la interrogasse direttamente via REST, esponendo
--    il rank di tutta la rete). Con security_invoker=true la vista rispetta la
--    RLS di chi la interroga — dentro le funzioni SECURITY DEFINER continua a
--    vedere tutto perché lì l'"invoker" è il ruolo elevato della funzione.
alter view member_ranks set (security_invoker = true);

-- 2) anon (utente non autenticato) poteva tecnicamente chiamare le funzioni di
--    scrittura: erano già innocue (falliscono subito per mancanza di sessione),
--    ma le blindiamo esplicitamente per ridurre la superficie.
revoke execute on function enroll_member(text, integer) from anon;
revoke execute on function register_sale(integer, integer) from anon;
revoke execute on function complete_registration(text, integer) from anon;

-- 3) le funzioni helper usate dentro le policy RLS erano eseguibili da PUBLIC
--    per default (comportamento standard Postgres alla creazione): le limitiamo
--    a chi ne ha davvero bisogno.
revoke execute on function current_member_code() from public, anon;
grant execute on function current_member_code() to authenticated, service_role;

revoke execute on function is_self_or_descendant(integer, integer) from public, anon;
grant execute on function is_self_or_descendant(integer, integer) to authenticated, service_role;
