-- Campo del form di registrazione sponsor-driven (Individuale/Azienda): per
-- un'azienda si può indicare se la P.IVA è "nazionale" (checkbox "Is
-- National Vat Id" nel riferimento mostrato dall'utente).
alter table member_profiles add column if not exists is_national_vat_id boolean not null default false;
