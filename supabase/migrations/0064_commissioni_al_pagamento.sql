-- LE COMMISSIONI NASCONO AL PAGAMENTO, NON ALL'ISCRIZIONE
--
-- Come funzionava: iscriversi generava una vendita, e anche il solo ordine
-- nel negozio ne generava un'altra. Le provvigioni scattavano prima che
-- fosse entrato un euro, e su un prodotto che nessuno aveva scelto (si
-- usava sempre il prezzo del primo modello a catalogo).
--
-- Come funziona adesso:
--   1. l'iscrizione e' GRATUITA e non genera nulla
--   2. la persona compra dal negozio scegliendo il modello
--   3. l'ordine resta "in attesa di pagamento", senza vendita collegata
--   4. quando il pagamento e' confermato nascono vendita e provvigioni,
--      sull'imponibile di quello che ha davvero comprato
--
-- Chi incassa la diretta: lo SPONSOR di chi compra. Se iscrivo Marco e Marco
-- compra dal suo portale, il 16% e' mio: la vendita l'ho fatta io.
--
-- La conferma oggi la da' l'azienda a mano. Quando ci sara' il sistema di
-- pagamento chiamera' la stessa funzione, conferma_pagamento_ordine(), e non
-- ci sara' niente da riscrivere.
--
-- Il calcolo delle provvigioni e' stato estratto in genera_commissioni():
-- prima viveva dentro register_sale, che pero' pretende che a chiamarla sia
-- il venditore stesso. Al pagamento chi chiama e' l'azienda, non lo sponsor.
--
-- register_sale resta ma solo per l'azienda: ora che le vendite nascono dai
-- pagamenti, lasciarla aperta a tutti significherebbe permettere di creare
-- provvigioni senza che sia entrato un euro.
--
-- Lo stato "pagato" non si imposta dal menu degli stati: passa dal pulsante
-- dedicato, ed e' li' che nascono le provvigioni. Un ordine pagato non torna
-- "in attesa", altrimenti si potrebbero generare due volte.
--
-- (I corpi aggiornati di genera_commissioni, create_shop_order,
-- conferma_pagamento_ordine, register_sale e set_shop_order_status sono
-- stati applicati al database con le migration corrispondenti.)

alter table shop_orders drop constraint if exists shop_orders_status_check;
alter table shop_orders
  add constraint shop_orders_status_check
  check (status in ('pending', 'paid', 'shipped', 'delivered', 'cancelled'));

alter table shop_orders
  add column if not exists paid_at timestamptz,
  add column if not exists paid_by integer references members(activity_code);
