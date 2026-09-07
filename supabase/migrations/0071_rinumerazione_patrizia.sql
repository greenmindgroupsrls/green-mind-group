-- PATRIZIA DA 11 A 7
--
-- Il contatore dei codici non si riavvolge quando una registrazione fallisce
-- a meta': i codici 7, 8, 9 e 10 erano stati consumati da tentativi che non
-- hanno prodotto nessun iscritto, e la persona arrivata dopo si e' ritrovata
-- con l'11 mentre l'ultimo vero era il 6. E' lo stesso motivo per cui Loris
-- aveva preso il 40 (vedi 0063_rinumerazione_membro.sql).
--
-- Il codice non e' un dettaglio interno: gli incaricati se lo scambiano per
-- indicare chi ha invitato chi, e un salto di quattro fa pensare a quattro
-- persone che non ci sono.
--
-- Il codice 11 compariva in tre righe soltanto: il membro, il suo profilo e
-- un messaggio. Le tre chiavi esterne coinvolte sono state rese rinviabili
-- per la durata della transazione - senza, spostare il membro avrebbe fatto
-- scattare il controllo prima di poter spostare le righe che lo citano - e
-- subito dopo rimesse com'erano.
--
-- Il contatore e' stato riportato a 7, cosi' il prossimo iscritto prende
-- l'8 e non il 12.
--
-- (Eseguito sul database; qui resta la traccia di cosa e' stato fatto.)

-- alter table member_profiles alter constraint member_profiles_activity_code_fkey deferrable initially immediate;
-- alter table messages alter constraint messages_sender_code_fkey deferrable initially immediate;
-- alter table messages alter constraint messages_recipient_code_fkey deferrable initially immediate;
--
-- begin;
--   set constraints all deferred;
--   update members         set activity_code = 7 where activity_code = 11;
--   update member_profiles set activity_code = 7 where activity_code = 11;
--   update messages        set sender_code    = 7 where sender_code = 11;
--   update messages        set recipient_code = 7 where recipient_code = 11;
--   select setval('members_activity_code_seq', 7, true);
-- commit;
--
-- alter table member_profiles alter constraint member_profiles_activity_code_fkey not deferrable;
-- alter table messages alter constraint messages_sender_code_fkey not deferrable;
-- alter table messages alter constraint messages_recipient_code_fkey not deferrable;

do $$
begin
  if exists (select 1 from members where activity_code = 11) then
    raise exception 'Rinumerazione non applicata: esiste ancora un membro con codice 11';
  end if;
end $$;
