-- Nei documenti italiani il luogo di nascita e' comune + provincia: senza
-- la sigla, "Verona" da solo e' ambiguo quando esistono comuni omonimi in
-- province diverse. EE indica chi e' nato in uno stato estero.
--
-- Il corpo completo della funzione aggiornata e' stato applicato al
-- database con la migration corrispondente; qui si registra la modifica
-- allo schema per tenere allineata la cronologia.
alter table incaricato_contracts add column if not exists birth_province text;
