-- Aumento di listino: entrambi i modelli salgono di 100 euro.
--   Vortix + 5 anni: 1.290 -> 1.390
--   Vortix + 8 anni: 1.390 -> 1.490
--
-- Le provvigioni sono percentuali sull'imponibile, quindi salgono da sole:
-- non c'e' nessuna tariffa da ritoccare. Sul modello da 1.390 la diretta
-- passa da 169,18 a 182,30.
--
-- Nessun ordine e nessuna vendita erano ancora stati registrati, quindi non
-- c'e' storico con i prezzi vecchi da preservare.
update products set price = 1390.00 where slug = 'vortix-5-anni';
update products set price = 1490.00 where slug = 'vortix-8-anni';

-- Il listino si cambia dal Centro di controllo invece che dal database.
-- Solo l'azienda, con annotazione nel registro delle azioni di cosa e'
-- passato da quanto a quanto. Le provvigioni sono percentuali
-- sull'imponibile e si adeguano da sole; quelle gia' maturate restano come
-- sono state calcolate al momento del pagamento.
-- (Il corpo di admin_update_product_prices() e' stato applicato al database
-- con la migration corrispondente.)
