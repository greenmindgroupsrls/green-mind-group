-- RIMOZIONE DEL PIANO A QUATTRO LIVELLI
--
-- Il piano precedente (100/100/50/20) non e' mai stato usato: al momento
-- del passaggio al Sistema 2 non esisteva nemmeno una vendita registrata,
-- quindi non c'e' storico da conservare. Le tariffe spariscono invece di
-- restare in giro a somigliare a numeri veri, e register_sale perde il ramo
-- che le applicava: da qui in avanti esiste una sola strada.
--
-- plan2_active_from resta, ma solo come data di partenza da mostrare nel
-- Centro di controllo: non decide piu' nulla.
--
-- Le qualifiche assegnate a mano dall'azienda NON vengono toccate: i cinque
-- incaricati restano Royal per volonta' aziendale, e continuano a
-- partecipare al Royal Pool come deciso.

-- Il corpo aggiornato di register_sale() (senza il ramo del piano vecchio) e
-- di enroll_member() (che non sposta piu' nessuno: lo spostamento avviene
-- solo dentro register_sale, sulle vendite qualificanti) e' stato applicato
-- al database con la migration corrispondente.

drop function if exists public.admin_update_compensation_settings(numeric, numeric, numeric, numeric);

alter table compensation_settings
  drop column if exists level0_rate,
  drop column if exists level1_rate,
  drop column if exists level2_rate,
  drop column if exists level3_rate;

comment on column compensation_settings.plan2_active_from is
  'Data di partenza del piano, mostrata nel Centro di controllo. Non decide piu'' nulla: esiste un piano solo.';
