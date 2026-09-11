-- UN CODICE PER OGNI PRODOTTO
--
-- Negli ordini la colonna prodotto mostrava il nome per esteso: "Vortix + 5
-- anni di garanzia". Va bene per chi compra, non per chi prepara le
-- spedizioni — due nomi che differiscono per una cifra si confondono a
-- colpo d'occhio, e un nome si puo' riscrivere mentre un codice no.
--
-- Le ultime tre cifre sono gli anni di garanzia: GMGV005 e GMGV008. Non e'
-- un dettaglio estetico, e' quello che rende il codice leggibile senza
-- doverlo cercare da qualche parte.

alter table public.products
  add column if not exists code text;

update public.products set code = 'GMGV005' where id = 1 and code is null;
update public.products set code = 'GMGV008' where id = 2 and code is null;

-- Chi nascesse dopo senza codice non deve restare senza: un codice
-- provvisorio e' meglio di una casella vuota in mezzo a un ordine.
update public.products
set code = 'GMGV' || lpad(id::text, 3, '0')
where code is null;

alter table public.products
  alter column code set not null;

-- Due prodotti con lo stesso codice renderebbero il codice inutile proprio
-- nel momento in cui serve: quando si legge un ordine e si va a prendere il
-- pezzo in magazzino.
create unique index if not exists products_code_key on public.products (code);

comment on column public.products.code is
  'Codice di magazzino mostrato negli ordini al posto del nome. GMGV + anni di garanzia su tre cifre.';
