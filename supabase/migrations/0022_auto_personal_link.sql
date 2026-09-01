-- Il link personale non si digita più a mano: viene assegnato in automatico
-- allo username al momento dell'iscrizione (garantito univoco perché lo
-- username lo è già — nessuna logica di collisione da gestire). Un trigger
-- copre TUTTI i percorsi di creazione membro (enroll_member,
-- complete_registration, e qualunque futuro) in un solo punto, invece di
-- ripetere la logica in ogni server action TS.

create or replace function ensure_member_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into member_profiles (activity_code, personal_domain)
  values (new.activity_code, new.username)
  on conflict (activity_code) do nothing;
  return new;
end;
$$;

drop trigger if exists members_after_insert_ensure_profile on members;
create trigger members_after_insert_ensure_profile
  after insert on members
  for each row
  execute function ensure_member_profile();

-- Backfill per i membri già esistenti prima di questo trigger.
insert into member_profiles (activity_code, personal_domain)
select m.activity_code, m.username
from members m
left join member_profiles mp on mp.activity_code = m.activity_code
where mp.activity_code is null
on conflict (activity_code) do nothing;

update member_profiles mp
set personal_domain = m.username
from members m
where mp.activity_code = m.activity_code
  and mp.personal_domain is null;
