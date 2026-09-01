-- Testi pronti da condividere ("Call 1", "Call 2", ...) nella pagina
-- Marketing: prima erano hardcoded in TS, ora spostati a tabella cosi'
-- l'account aziendale (root, activity_code = 0) puo' modificarli e
-- aggiungerne di nuovi dal back office, mentre tutti gli altri membri li
-- vedono in sola lettura. Stesso pattern SECURITY DEFINER root-gated gia'
-- usato per marketing_documents/events/announcements: RLS select-aperta,
-- scritture solo via RPC.
--
-- Il link personale non e' salvato nel testo (e' diverso per ogni membro):
-- il corpo contiene il segnaposto letterale "{{link}}", sostituito lato
-- client con il link personale del viewer al momento della visualizzazione.
create table if not exists marketing_call_scripts (
  id bigint generated always as identity primary key,
  label text not null,
  body text not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by integer references members(activity_code)
);

alter table marketing_call_scripts enable row level security;

create policy "marketing_call_scripts_select_all"
  on marketing_call_scripts for select
  using (true);

insert into marketing_call_scripts (label, body, sort_order)
values
  ('Call 1', 'Ti faccio una domanda scomoda: se da domani il tuo stipendio si fermasse, quanto reggeresti? Io me la sono fatta qualche mese fa, e ho iniziato a costruire un piano B che non mi ha tolto tempo alla vita che ho già. Se sei curioso/a di vedere come, dai un''occhiata qui: {{link}}', 1),
  ('Call 2', 'Nessuno te lo dice, ma aspettare un aumento non è un piano: è una speranza. Io ho scelto di costruirmi un''alternativa concreta, poche ore a settimana, partendo da quello che faccio già. Ti va di vedere di cosa si tratta? {{link}}', 2),
  ('Call 3', 'Conosci la sensazione di arrivare al 20 del mese e iniziare a fare i conti? L''ho vissuta anch''io, ed è quello che mi ha spinto a cercare qualcosa che potesse trasformarsi in un''entrata reale nel tempo, senza stravolgere la mia vita. Se ti incuriosisce, guarda qui, senza impegno: {{link}}', 3),
  ('Call 4', 'Qualche mese fa ero scettico/a quanto te adesso. Poi ho deciso di guardare sul serio un progetto che mi ha permesso di iniziare a costruire un''entrata extra, senza lasciare quello che già facevo. Non prometto miracoli, ma vale la pena guardarci dentro con la tua testa, non con la mia: {{link}}', 4),
  ('Call 5', 'Non è per tutti, ed è giusto così: chi cerca una scorciatoia qui non trova niente. Ma se stai davvero cercando un modo concreto per costruire un''entrata extra nel tempo, partendo da poche ore a settimana, dacci un''occhiata: {{link}}', 5)
on conflict do nothing;

create or replace function admin_set_call_script(p_id bigint, p_label text, p_body text)
returns marketing_call_scripts
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  updated marketing_call_scripts;
begin
  if caller is null or caller <> 0 then
    raise exception 'Non autorizzato';
  end if;
  if p_label is null or trim(p_label) = '' then
    raise exception 'Etichetta obbligatoria';
  end if;
  if p_body is null or trim(p_body) = '' then
    raise exception 'Testo obbligatorio';
  end if;

  update marketing_call_scripts set
    label = trim(p_label),
    body = p_body,
    updated_at = now(),
    updated_by = caller
  where id = p_id
  returning * into updated;

  if updated is null then
    raise exception 'Call % non trovata', p_id;
  end if;

  perform log_admin_action('call_script_updated', null, jsonb_build_object('id', p_id, 'label', updated.label));

  return updated;
end;
$$;

revoke all on function admin_set_call_script(bigint, text, text) from public, anon;
grant execute on function admin_set_call_script(bigint, text, text) to authenticated;

create or replace function admin_add_call_script(p_label text, p_body text)
returns marketing_call_scripts
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  next_order integer;
  new_row marketing_call_scripts;
begin
  if caller is null or caller <> 0 then
    raise exception 'Non autorizzato';
  end if;
  if p_label is null or trim(p_label) = '' then
    raise exception 'Etichetta obbligatoria';
  end if;
  if p_body is null or trim(p_body) = '' then
    raise exception 'Testo obbligatorio';
  end if;

  select coalesce(max(sort_order), 0) + 1 into next_order from marketing_call_scripts;

  insert into marketing_call_scripts (label, body, sort_order, updated_by)
  values (trim(p_label), p_body, next_order, caller)
  returning * into new_row;

  perform log_admin_action('call_script_added', null, jsonb_build_object('id', new_row.id, 'label', new_row.label));

  return new_row;
end;
$$;

revoke all on function admin_add_call_script(text, text) from public, anon;
grant execute on function admin_add_call_script(text, text) to authenticated;
