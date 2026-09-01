-- Auto-registrazione: un nuovo iscritto crea da solo il proprio account
-- (email+password o Google) e poi "reclama" la propria posizione nell'albero
-- indicando il codice di chi lo ha invitato. A differenza di enroll_member()
-- (dove è lo sponsor già collegato a un account a iscrivere qualcun altro),
-- qui il chiamante non ha ancora nessuna riga in members: usiamo auth.uid()
-- direttamente invece di current_member_code() (che richiederebbe una riga
-- già esistente, creando una dipendenza circolare).

create or replace function complete_registration(p_username text, p_ref_code integer)
returns members
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  user_email text := auth.email();
  ref_row members;
  new_member members;
begin
  if uid is null then
    raise exception 'Devi essere autenticato per completare la registrazione';
  end if;

  if exists (select 1 from members where auth_user_id = uid) then
    raise exception 'Il tuo account è già collegato a un iscritto';
  end if;

  select * into ref_row from members where activity_code = p_ref_code for update;
  if ref_row is null then
    raise exception 'Codice ref % non trovato', p_ref_code;
  end if;

  insert into members (username, ref_sponsor_code, parent_code, auth_user_id, email)
  values (p_username, p_ref_code, p_ref_code, uid, user_email)
  returning * into new_member;

  if p_ref_code <> 0 and not ref_row.pass_up_done then
    if (select count(*) from members where ref_sponsor_code = p_ref_code) >= 3 then
      update members set parent_code = ref_row.parent_code
      where activity_code in (
        select activity_code from members
        where ref_sponsor_code = p_ref_code
        order by activity_code asc
        limit 2
      );

      update members set pass_up_done = true where activity_code = p_ref_code;
    end if;
  end if;

  return new_member;
end;
$$;

revoke all on function complete_registration(text, integer) from public;
grant execute on function complete_registration(text, integer) to authenticated;
