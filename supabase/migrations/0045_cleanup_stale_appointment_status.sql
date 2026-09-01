-- Bonifica una tantum: prima di questa modifica lo stato "Appuntamento" di
-- un contatto veniva scritto una volta e non si aggiornava mai piu', anche
-- cancellando/completando l'attivita' collegata (vedi commit che introduce
-- crm.ts:withEffectiveStatus — d'ora in poi lo stato "Appuntamento" e'
-- calcolato al volo dall'esistenza di un'attivita' aperta, non piu' salvato
-- a mano). Qui si riportano a "niente" i contatti rimasti bloccati su
-- "appuntamento" senza piu' nessuna attivita' aperta collegata.
update crm_contacts c
set status = 'niente', updated_at = now()
where c.status = 'appuntamento'
  and not exists (
    select 1 from crm_tasks t
    where t.contact_id = c.id and t.kind = 'appuntamento' and t.done = false
  );
