-- RINUMERAZIONE: il membro 40 diventa 6.
--
-- Perche': le prove del piano compensi erano state fatte creando membri
-- finti dentro transazioni annullate. Le righe sparivano, ma le sequenze in
-- PostgreSQL NON si annullano — sono volutamente non transazionali, cosi'
-- due iscrizioni in parallelo non si bloccano a vicenda. Risultato: i codici
-- da 6 a 78 bruciati, e il primo iscritto vero si e' ritrovato il 40.
--
-- Il codice attivita' non e' un identificativo interno: finisce sul
-- contratto e le persone lo usano per riconoscersi. Sistemato mentre
-- l'interessato non aveva ancora vendite, contratti ne' rete sotto di se'.
--
-- Come: i 33 vincoli verso members non hanno aggiornamento a cascata, quindi
-- sono stati resi rinviabili per la durata dell'operazione, cambiati codice
-- e riferimenti insieme, e rimessi come prima.
--
-- NOTA PER IL FUTURO: prima di creare righe di prova su una tabella con
-- codice progressivo visibile alle persone, annotare il valore della
-- sequenza e rimetterlo dopo il rollback:
--   select last_value from members_activity_code_seq;
--   ... prove ...
--   select setval('members_activity_code_seq', <valore>, true);

do $$ declare r record; begin
  for r in select conrelid::regclass::text t, conname from pg_constraint
           where contype='f' and confrelid='members'::regclass loop
    execute format('alter table %s alter constraint %I deferrable initially immediate', r.t, r.conname);
  end loop;
end $$;

set constraints all deferred;

update members set activity_code = 6 where activity_code = 40;

do $$ declare r record; begin
  for r in select c.conrelid::regclass::text t, a.attname col
           from pg_constraint c
           join unnest(c.conkey) with ordinality k(attnum, ord) on true
           join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.attnum
           where c.contype='f' and c.confrelid='members'::regclass loop
    execute format('update %s set %I = 6 where %I = 40', r.t, r.col, r.col);
  end loop;
end $$;

set constraints all immediate;

select setval('members_activity_code_seq', 6, true);

do $$ declare r record; begin
  for r in select conrelid::regclass::text t, conname from pg_constraint
           where contype='f' and confrelid='members'::regclass loop
    execute format('alter table %s alter constraint %I not deferrable', r.t, r.conname);
  end loop;
end $$;
