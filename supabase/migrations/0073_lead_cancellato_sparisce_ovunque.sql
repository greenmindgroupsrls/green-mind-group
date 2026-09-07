-- CANCELLARE UN LEAD LO CANCELLA ANCHE A CHI ERA STATO ASSEGNATO
--
-- Il cestino nella pagina Lead serve per le registrazioni fasulle. Ma il
-- contatto nato dall'assegnazione era agganciato con ON DELETE SET NULL:
-- il lead spariva dall'elenco aziendale e il contatto restava nell'agenda
-- dell'incaricato, per giunta senza piu' il collegamento che diceva da dove
-- veniva. Quella persona continuava a comparire fra i "da chiamare", e
-- nessuno poteva piu' risalire al perche'.
--
-- CASCADE: se il lead non deve esistere, non deve esistere per nessuno.
-- Vale anche se un domani un lead viene cancellato per un'altra strada, il
-- che e' il motivo per cui la regola sta sulla chiave e non dentro
-- admin_delete_lead.

alter table crm_contacts drop constraint if exists crm_contacts_lead_id_fkey;
alter table crm_contacts
  add constraint crm_contacts_lead_id_fkey
  foreign key (lead_id) references leads(id) on delete cascade;
