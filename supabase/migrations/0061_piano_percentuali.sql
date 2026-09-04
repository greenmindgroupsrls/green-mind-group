-- PIANO COMPENSI A PERCENTUALE
--
-- Gli importi fissi diventano percentuali sull'imponibile del prodotto
-- venduto:
--   16%  provvigione diretta a chi vende
--    7%  pass-up al primo VIP risalendo, sulle prime vendite qualificanti
--    3%  quota Royal, al primo Royal risalendo
--    2%  indennizzo a chi ha ceduto la linea, finche' non diventa Royal
--
-- Poiche' i due modelli costano diverso (1.290 e 1.390), la vendita deve
-- registrare QUALE prodotto e' stato venduto: con gli importi fissi non
-- serviva, adesso si'.
--
-- Tre regole decise dall'azienda e implementate qui:
--
--   * Il 3% si ferma dove incontra un altro Royal. Ogni vendita paga il 3%
--     una volta sola, al Royal piu' vicino: il costo non cresce con la
--     profondita' della rete. Se sopra non c'e' nessun Royal la quota resta
--     all'azienda come margine.
--
--   * Royal si conta su chi ti sei ISCRITTO, non su chi ti e' arrivato per
--     eredita' dai pass-up altrui. Le linee che hai ceduto continuano a
--     contare: le hai portate tu, e altrimenti cederle ti allontanerebbe
--     dalla qualifica invece di avvicinarti.
--
--   * Il 2% lo prende chi la linea l'ha PERSA, non chi l'ha ricevuta: e' un
--     indennizzo per le due linee cedute, su tutto cio' che nasce da loro.
--     Finisce quando chi lo percepisce diventa Royal, perche' da li' in poi
--     prende il 3% sul proprio gruppo. Come per il 3%, si paga una volta
--     sola per vendita, a chi sta piu' vicino risalendo.
--
-- Il corpo aggiornato di register_sale(), verifica_qualifica_royal() e
-- liquida_royal_pool(), piu' le funzioni nuove imponibile_vendita(),
-- trova_royal_superiore() e trova_cedente(), sono stati applicati al
-- database con le migration corrispondenti.

alter table sales
  add column if not exists product_id bigint references products(id);

alter table compensation_settings
  add column if not exists plan2_direct_pct  numeric(5,2) not null default 16.00,
  add column if not exists plan2_passup_pct  numeric(5,2) not null default 7.00,
  add column if not exists plan2_royal_pct   numeric(5,2) not null default 3.00,
  add column if not exists plan2_upline_pct  numeric(5,2) not null default 2.00,
  add column if not exists vat_rate          numeric(5,2) not null default 22.00;

alter table commission_entries drop constraint if exists commission_entries_kind_check;
alter table commission_entries
  add constraint commission_entries_kind_check
  check (kind is null or kind in ('diretta', 'pass_up', 'upline', 'pool_royal'));

alter table commission_entries drop constraint if exists commission_entries_level_check;
alter table commission_entries
  add constraint commission_entries_level_check
  check (level >= 0 and level <= 5);

-- Il Royal Pool non e' piu' un fondo unico diviso in parti uguali: ogni
-- quota nasce gia' intestata al Royal a cui spetta.
alter table royal_pool_entries
  add column if not exists beneficiary_code integer references members(activity_code);

create index if not exists royal_pool_entries_beneficiario_idx
  on royal_pool_entries (beneficiary_code) where settlement_id is null;

-- Il Centro di controllo governa le percentuali e l'aliquota IVA, non piu'
-- degli importi in euro. Il controllo sulla somma serve a fermare l'errore
-- di battitura che distribuirebbe piu' del fatturato.
-- (Il corpo di admin_update_plan2_settings() e' stato applicato al database
-- con la migration corrispondente.)

alter table compensation_settings
  drop column if exists plan2_direct_rate,
  drop column if exists plan2_passup_rate,
  drop column if exists plan2_pool_rate;

-- CORREZIONE: chi e' gia' VIP o Royal non cede piu' linee.
--
-- Il pass-up e' il prezzo della qualifica: cedi le prime due vendite e in
-- cambio diventi VIP. Chi la qualifica ce l'ha gia' - conquistata oppure
-- assegnata a mano dall'azienda - quel prezzo l'ha gia' pagato.
--
-- Senza questo controllo i cinque account fondatori, Royal per assegnazione
-- aziendale ma con passed_up_count a zero, avrebbero perso le prime due
-- linee a testa: verificato in prova prima della correzione, il nuovo
-- iscritto finiva sotto l'azienda e il pass-up lo incassava l'azienda.
-- La condizione ora guarda il RANGO, non solo il contatore.
-- (Il corpo aggiornato di register_sale() e' stato applicato al database
-- con la migration corrispondente.)
