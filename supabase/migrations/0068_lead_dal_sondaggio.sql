-- I CONTATTI DEL SONDAGGIO ARRIVANO NEI LEAD
--
-- Il sondaggio salvava solo il buono: nome e mail restavano dentro la
-- tabella dei coupon, e le 15 risposte venivano buttate. La domanda che
-- vale di piu' - "quanto e' probabile che tu acquisti" - non arrivava a
-- nessuno.
--
-- Adesso ogni sondaggio completato diventa un lead come le prenotazioni,
-- con stato, note, inoltro a un incaricato e cestino gia' pronti.
--
-- Due conseguenze sulla tabella:
--
--   * il telefono diventa facoltativo. Il sondaggio non lo chiede, e
--     chiederlo all'ultimo passaggio di un modulo da 15 domande e' il modo
--     migliore per perdere la risposta proprio sul piu' bello.
--
--   * "source" smette di dire da quale SITO arriva il contatto (era sempre
--     'vortix', un'informazione che non distingue piu' niente da quando i
--     due progetti sono uno solo) e dice invece COSA ha fatto la persona:
--     ha chiesto un appuntamento, o ha risposto al sondaggio.

alter table leads alter column phone drop not null;

alter table leads
  add column if not exists survey_answers jsonb;

comment on column leads.survey_answers is
  'Le risposte del sondaggio, come elenco di {domanda, risposta}: il testo della domanda viaggia col dato, cosi la scheda resta leggibile anche se il sondaggio cambia.';

update leads set source = 'appuntamento' where source = 'vortix';

alter table leads drop constraint if exists leads_source_check;
alter table leads add constraint leads_source_check
  check (source in ('appuntamento', 'sondaggio'));

-- === Un solo ingresso per il sondaggio =====================================
-- Lead e coupon nascono insieme o non nascono: se la registrazione del
-- contatto fallisse dopo aver emesso il buono, avremmo regalato 100 euro
-- senza sapere a chi.
create or replace function public.registra_sondaggio(
  p_email text,
  p_nome text,
  p_risposte jsonb default null,
  p_importo numeric default 100
)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  codice text;
  nome text := nullif(trim(coalesce(p_nome, '')), '');
  mail text := trim(coalesce(p_email, ''));
  esistente bigint;
begin
  -- valida la mail e riusa il buono gia' emesso, se c'e'
  codice := crea_coupon_sondaggio(mail, nome, p_importo);

  -- Una mail, un lead: chi rifa' il sondaggio aggiorna le sue risposte
  -- invece di comparire due volte nell'elenco.
  select id into esistente from leads
  where source = 'sondaggio' and lower(email) = lower(mail)
  order by created_at limit 1;

  if esistente is null then
    insert into leads (source, name, phone, email, survey_answers)
    values ('sondaggio', coalesce(nome, mail), null, mail, p_risposte);
  else
    update leads
    set survey_answers = coalesce(p_risposte, survey_answers),
        name = coalesce(nome, name),
        updated_at = now()
    where id = esistente;
  end if;

  return codice;
end;
$function$;

revoke all on function public.registra_sondaggio(text, text, jsonb, numeric) from public;
grant execute on function public.registra_sondaggio(text, text, jsonb, numeric) to anon, authenticated;

-- Il buono non si emette piu' per conto suo: si passa da registra_sondaggio,
-- che registra anche chi lo ha ricevuto.
revoke execute on function public.crea_coupon_sondaggio(text, text, numeric) from anon;
