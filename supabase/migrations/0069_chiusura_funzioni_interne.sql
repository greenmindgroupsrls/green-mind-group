-- CHIUSURA DELLE FUNZIONI INTERNE
--
-- Postgres, quando si crea una funzione, concede EXECUTE a PUBLIC. Nelle
-- migration recenti la revoca c'era; in quelle piu' vecchie no. Risultato:
-- tredici funzioni erano chiamabili da chiunque via PostgREST con la sola
-- chiave anonima, che sta nel browser di ogni visitatore.
--
-- Per dieci di queste non cambiava niente: hanno un controllo dentro
-- ('Non autorizzato' se il chiamante non e' l'azienda), e per un anonimo
-- current_member_code() e' null. Restavano comunque raggiungibili, ed e'
-- una porta che non ha motivo di esistere.
--
-- Tre invece non avevano nessun controllo, perche' nate per essere chiamate
-- solo da dentro altre funzioni:
--
--   genera_commissioni(vendita, venditore, acquirente, imponibile)
--     scrive le righe di provvigione e la quota del Royal Pool. Chi la
--     chiamava sceglieva beneficiario e importo.
--
--   verifica_qualifica_royal(codice)
--     scrive royal_qualified_at, cioe' promuove un membro a Royal.
--
--   imponibile_vendita / trova_cedente / trova_royal_superiore
--     sola lettura, ma raccontano la struttura della rete.
--
-- Le chiamate interne non passano dai permessi: dentro una funzione
-- SECURITY DEFINER si esegue come proprietario. Togliere il permesso non
-- cambia nulla per il flusso vero, chiude solo la porta di servizio.

-- Solo uso interno: nessuno le chiama da fuori.
revoke all on function public.genera_commissioni(bigint, integer, integer, numeric) from public, anon, authenticated;
revoke all on function public.verifica_qualifica_royal(integer) from public, anon, authenticated;
revoke all on function public.imponibile_vendita(bigint, integer) from public, anon, authenticated;
revoke all on function public.trova_cedente(integer) from public, anon, authenticated;
revoke all on function public.trova_royal_superiore(integer) from public, anon, authenticated;

-- Riservate all'azienda: il controllo dentro resta, ma un anonimo non deve
-- nemmeno poterle raggiungere.
revoke all on function public.admin_delete_lead(bigint) from public, anon;
grant execute on function public.admin_delete_lead(bigint) to authenticated;

revoke all on function public.conferma_pagamento_ordine(bigint) from public, anon;
grant execute on function public.conferma_pagamento_ordine(bigint) to authenticated;

revoke all on function public.liquida_royal_pool() from public, anon;
grant execute on function public.liquida_royal_pool() to authenticated;

revoke all on function public.admin_update_plan2_settings(numeric, numeric, numeric, numeric, numeric, integer, integer) from public, anon;
grant execute on function public.admin_update_plan2_settings(numeric, numeric, numeric, numeric, numeric, integer, integer) to authenticated;

revoke all on function public.admin_update_product_prices(jsonb) from public, anon;
grant execute on function public.admin_update_product_prices(jsonb) to authenticated;

revoke all on function public.register_sale(integer, integer, integer, bigint) from public, anon;
grant execute on function public.register_sale(integer, integer, integer, bigint) to authenticated;
