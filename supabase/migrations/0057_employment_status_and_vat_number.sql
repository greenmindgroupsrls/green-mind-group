-- f) Le tre voci (disoccupato / iscritto a gestione previdenziale /
-- pensionato) diventano una scelta unica a tendina. NOTA: nel contratto
-- cartaceo sono tre caselle indipendenti, quindi in teoria si potrebbe
-- essere pensionati E iscritti a gestione previdenziale; qui diventano
-- alternative. Semplificazione richiesta esplicitamente dall'azienda.
--
-- g) Chi ha partita IVA deve indicarne anche il numero (11 cifre), non solo
-- il regime: senza il numero il dato non serve a nulla in fattura.
--
-- Il corpo aggiornato di sign_incaricato_contract() e' stato applicato al
-- database con la migration corrispondente.

alter table incaricato_contracts
  drop column if exists decl_unemployed,
  drop column if exists decl_social_security,
  drop column if exists decl_pensioner;

alter table incaricato_contracts
  add column if not exists decl_employment_status text,
  add column if not exists decl_vat_number text;
