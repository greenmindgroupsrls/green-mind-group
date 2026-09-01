-- Rete unilevel: anagrafica iscritti + struttura commissioni con regola di pass-up.
--
-- Ogni membro ha due relazioni distinte:
--   ref_sponsor_code : chi lo ha fisicamente iscritto (fisso per sempre, storico)
--   parent_code      : posizione nell'albero strutturale usato per le commissioni (puo' cambiare)
--
-- Regola di pass-up (one-time per nodo):
--   Quando un nodo X riceve il suo 3o iscritto ref (ref_sponsor_code = X), i primi 2
--   (per ordine di iscrizione, cioe' activity_code crescente) tra i referral di X vengono
--   spostati strutturalmente sotto l'attuale parent_code di X, portando con se' tutto il
--   proprio sotto-albero (si cambia solo il loro parent_code, i loro discendenti restano
--   agganciati a loro). Da quel momento (pass_up_done = true) l'evento non si ripete mai
--   piu' per quel nodo: dal 3o iscritto in poi (compreso) tutti restano fissi sotto X.
--   Nessuna cascata: se il parent che riceve i 2 spostati supera quota 2 diretti
--   strutturali, non succede nulla (il limite vale solo per iscrizioni ref dirette nuove).
--   Il nodo radice (activity_code = 0, l'azienda) non ha alcun limite: i suoi referral
--   diretti restano sempre fissi, illimitati.

create table if not exists members (
  activity_code integer primary key,
  username text not null unique,
  ref_sponsor_code integer references members (activity_code),
  parent_code integer references members (activity_code),
  pass_up_done boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists members_ref_sponsor_code_idx on members (ref_sponsor_code);
create index if not exists members_parent_code_idx on members (parent_code);

-- La radice (azienda) e' il codice 0. Il contatore per i nuovi iscritti riparte da 1.
create sequence if not exists members_activity_code_seq start with 1;
alter table members alter column activity_code set default nextval('members_activity_code_seq');

insert into members (activity_code, username, ref_sponsor_code, parent_code, pass_up_done)
values (0, 'green-mind-group', null, null, false)
on conflict (activity_code) do nothing;

-- Iscrive un nuovo membro tramite il codice ref di chi lo ha invitato, applicando
-- atomicamente la regola di pass-up. Il lock su ref_row evita race condition quando
-- piu' iscrizioni con lo stesso ref arrivano in concorrenza.
create or replace function enroll_member(p_username text, p_ref_code integer)
returns members
language plpgsql
as $$
declare
  ref_row members;
  new_member members;
  ref_count integer;
  moved_codes integer[];
begin
  select * into ref_row from members where activity_code = p_ref_code for update;

  if ref_row is null then
    raise exception 'Codice ref % non trovato', p_ref_code;
  end if;

  insert into members (username, ref_sponsor_code, parent_code)
  values (p_username, p_ref_code, p_ref_code)
  returning * into new_member;

  if p_ref_code <> 0 and not ref_row.pass_up_done then
    select count(*) into ref_count from members where ref_sponsor_code = p_ref_code;

    if ref_count >= 3 then
      select array_agg(activity_code) into moved_codes
      from (
        select activity_code from members
        where ref_sponsor_code = p_ref_code
        order by activity_code asc
        limit 2
      ) first_two;

      update members set parent_code = ref_row.parent_code
      where activity_code = any(moved_codes);

      update members set pass_up_done = true
      where activity_code = p_ref_code;
    end if;
  end if;

  return new_member;
end;
$$;
