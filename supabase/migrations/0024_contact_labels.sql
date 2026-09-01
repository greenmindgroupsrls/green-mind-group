-- Sostituisce la pipeline di vendita (da_contattare/contattato/interessato/
-- convertito/perso) con etichette più adatte al lavoro quotidiano di
-- chiamate su un'agenda: da_chiamare, niente, appuntamento, richiamare.
update crm_contacts
set status = 'da_chiamare'
where status not in ('da_chiamare', 'niente', 'appuntamento', 'richiamare');

alter table crm_contacts drop constraint if exists crm_contacts_status_check;
alter table crm_contacts alter column status set default 'da_chiamare';
alter table crm_contacts
  add constraint crm_contacts_status_check
  check (status in ('da_chiamare', 'niente', 'appuntamento', 'richiamare'));
