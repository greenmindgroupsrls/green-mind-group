-- Permette a un iscritto autenticato di aggiornare nome/cognome sulla
-- propria riga (e solo la propria): coerente con il resto del sistema, dove
-- ogni scrittura passa da una funzione SECURITY DEFINER con controllo
-- interno invece che da policy RLS di update dirette sulla tabella.
create or replace function update_own_profile(p_first_name text, p_last_name text)
returns members
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  updated members;
begin
  if caller is null then
    raise exception 'Devi essere autenticato per aggiornare il profilo';
  end if;
  if p_first_name is null or btrim(p_first_name) = '' then
    raise exception 'Il nome è obbligatorio';
  end if;
  if p_last_name is null or btrim(p_last_name) = '' then
    raise exception 'Il cognome è obbligatorio';
  end if;

  update members
  set first_name = p_first_name, last_name = p_last_name
  where activity_code = caller
  returning * into updated;

  return updated;
end;
$$;

revoke all on function update_own_profile(text, text) from public, anon;
grant execute on function update_own_profile(text, text) to authenticated;
