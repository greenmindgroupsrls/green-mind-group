-- Link di invito personale (gmg.app/<personal_domain>): un visitatore non
-- autenticato deve poter risolvere lo slug in "chi lo ha invitato" (codice
-- + username) per registrarsi con il ref già bloccato. Unica funzione del
-- progetto pensata per essere chiamabile da `anon` — espone solo il minimo
-- indispensabile (codice attività e username, non l'intero member_profiles).
create or replace function resolve_referral_link(p_slug text)
returns table (activity_code integer, username text)
language sql
security definer
set search_path = public
stable
as $$
  select m.activity_code, m.username
  from members m
  join member_profiles p on p.activity_code = m.activity_code
  where p.personal_domain = p_slug
  limit 1;
$$;

grant execute on function resolve_referral_link(text) to anon, authenticated;
