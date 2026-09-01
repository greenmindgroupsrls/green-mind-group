-- Sostituisce le Dichiarazioni Referente provvisorie con quelle reali del
-- contratto (lettere a-h). Nessun contratto era ancora stato firmato,
-- quindi si e' potuto ristrutturare senza migrare dati.
--
-- Tre nature diverse, rese con controlli diversi nel form:
--   a-d  affermazioni che DEVONO essere vere per firmare -> spunta obbligatoria
--   e-f  scelte binarie con entrambe le risposte valide  -> Si'/No
--   g-h  condizionali: regime fiscale solo con partita IVA, situazione
--        Art. 53 D.Lgs. 165/2001 solo per i dipendenti pubblici
--
-- Il corpo aggiornato di sign_incaricato_contract() e' stato applicato al
-- database con la migration corrispondente.

alter table incaricato_contracts
  drop column if exists decl_other_companies,
  drop column if exists decl_inps_exceeded,
  drop column if exists decl_clean_record;

alter table incaricato_contracts
  add column if not exists decl_adult boolean not null default false,
  add column if not exists decl_honorability boolean not null default false,
  add column if not exists decl_no_compete boolean not null default false,
  add column if not exists decl_no_conflict boolean not null default false,
  add column if not exists decl_earned_threshold boolean not null default false,
  add column if not exists decl_unemployed boolean not null default false,
  add column if not exists decl_social_security boolean not null default false,
  add column if not exists decl_pensioner boolean not null default false,
  add column if not exists decl_vat_regime text,
  add column if not exists decl_public_full_time boolean;
