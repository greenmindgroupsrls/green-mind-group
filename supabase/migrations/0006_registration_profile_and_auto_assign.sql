-- Estende l'auto-registrazione: nome/cognome come profilo, e un'opzione
-- "non ho un ref" che assegna automaticamente lo sponsor più vicino a
-- salire di livello (chi ha già più referral, cioè più vicino a 3), per
-- aiutare la crescita della rete a distribuirsi. Lo username resta
-- l'identificativo interno usato dall'albero/ref, ma ora viene generato
-- automaticamente dall'email invece di essere scelto a mano.

alter table members add column if not exists first_name text;
alter table members add column if not exists last_name text;

drop function if exists complete_registration(text, integer);

-- Tra chi non ha ancora attivato il pass-up (quindi ha 0, 1 o 2 referral),
-- sceglie chi ne ha di più (più vicino al 3° che fa scattare il pass-up),
-- a parità sceglie il più anziano (activity_code più basso).
create or replace function find_sponsor_for_orphan()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select activity_code
  from members
  where pass_up_done = false
  order by (
    select count(*) from members r where r.ref_sponsor_code = members.activity_code
  ) desc, activity_code asc
  limit 1
$$;

create or replace function complete_registration(
  p_first_name text,
  p_last_name text,
  p_ref_code integer default null,
  p_auto_assign boolean default false
)
returns members
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  user_email text := auth.email();
  actual_ref_code integer;
  ref_row members;
  new_member members;
  base_username text;
  candidate_username text;
  suffix integer := 0;
begin
  if uid is null then
    raise exception 'Devi essere autenticato per completare la registrazione';
  end if;

  if exists (select 1 from members where auth_user_id = uid) then
    raise exception 'Il tuo account è già collegato a un iscritto';
  end if;

  if p_first_name is null or btrim(p_first_name) = '' then
    raise exception 'Il nome è obbligatorio';
  end if;
  if p_last_name is null or btrim(p_last_name) = '' then
    raise exception 'Il cognome è obbligatorio';
  end if;

  if p_auto_assign then
    actual_ref_code := find_sponsor_for_orphan();
    if actual_ref_code is null then
      actual_ref_code := 0;
    end if;
  else
    actual_ref_code := p_ref_code;
  end if;

  if actual_ref_code is null then
    raise exception 'Codice ref mancante';
  end if;

  select * into ref_row from members where activity_code = actual_ref_code for update;
  if ref_row is null then
    raise exception 'Codice ref % non trovato', actual_ref_code;
  end if;

  base_username := regexp_replace(
    lower(split_part(coalesce(user_email, 'utente'), '@', 1)),
    '[^a-z0-9_.]', '', 'g'
  );
  if base_username = '' then
    base_username := 'utente';
  end if;
  candidate_username := base_username;
  while exists (select 1 from members where username = candidate_username) loop
    suffix := suffix + 1;
    candidate_username := base_username || suffix::text;
  end loop;

  insert into members (username, first_name, last_name, ref_sponsor_code, parent_code, auth_user_id, email)
  values (candidate_username, p_first_name, p_last_name, actual_ref_code, actual_ref_code, uid, user_email)
  returning * into new_member;

  if actual_ref_code <> 0 and not ref_row.pass_up_done then
    if (select count(*) from members where ref_sponsor_code = actual_ref_code) >= 3 then
      update members set parent_code = ref_row.parent_code
      where activity_code in (
        select activity_code from members
        where ref_sponsor_code = actual_ref_code
        order by activity_code asc
        limit 2
      );

      update members set pass_up_done = true where activity_code = actual_ref_code;
    end if;
  end if;

  return new_member;
end;
$$;

revoke all on function complete_registration(text, text, integer, boolean) from public, anon;
grant execute on function complete_registration(text, text, integer, boolean) to authenticated;

revoke all on function find_sponsor_for_orphan() from public, anon;
grant execute on function find_sponsor_for_orphan() to authenticated, service_role;
