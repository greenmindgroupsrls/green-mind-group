-- ERRORI CON UN CODICE, NON CON UNA FRASE IN ITALIANO
--
-- Le funzioni sollevavano errori scritti in italiano ("Il carrello e'
-- vuoto"), e l'interfaccia li mostrava cosi' com'erano. In un back office
-- tradotto in sei lingue voleva dire che al primo intoppo tornava fuori
-- l'italiano, proprio nel momento peggiore: quando qualcosa non funziona.
--
-- Adesso sollevano un codice stabile - gmg.carrello_vuoto - e la frase la
-- sceglie chi la deve mostrare. Il codice non cambia con la lingua, quindi
-- va bene anche per i log e per capire cosa e' successo davvero.
--
-- Riguarda le dodici funzioni che un utente tocca comprando, prelevando,
-- iscrivendosi, scrivendo un messaggio o aprendo un ticket. Le altre
-- trenta continuano a sollevare in italiano: le raggiunge solo l'account
-- aziendale, e in ogni caso l'interfaccia non mostra piu' il testo grezzo
-- di un errore che non riconosce.
--
-- La riscrittura passa da pg_get_functiondef e sostituisce SOLO la frase
-- dentro raise exception: nessun corpo e' stato ricopiato a mano, quindi
-- non c'e' modo che una funzione sia cambiata per una svista di battitura.
-- Il numero di segnaposto % resta identico, perche' e' il conteggio degli
-- argomenti passati a RAISE e sbagliarlo farebbe fallire la chiamata.

do $riscrittura$
declare
  f record; def text; nuovo text; c record; n integer := 0;
begin
  for f in
    select p.oid, p.proname from pg_proc p
    join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname = 'public' and p.proname = any (array['create_shop_order', 'create_withdrawal_request', 'send_message', 'create_support_ticket', 'complete_registration', 'enroll_member', 'crea_coupon_sondaggio', 'register_kyc_document', 'become_incaricato', 'create_event', 'update_event', 'delete_event'])
  loop
    def := pg_get_functiondef(f.oid);
    nuovo := def;
    for c in select * from (values
      ('Devi essere autenticato', 'gmg.non_autenticato'),
      ('Devi essere autenticato per acquistare', 'gmg.non_autenticato'),
      ('Devi essere autenticato per completare la registrazione', 'gmg.non_autenticato'),
      ('Devi essere autenticato per aprire un ticket', 'gmg.non_autenticato'),
      ('Devi essere autenticato per richiedere un prelievo', 'gmg.non_autenticato'),
      ('Devi essere autenticato per inviare un messaggio', 'gmg.non_autenticato'),
      ('Devi essere autenticato per caricare un documento', 'gmg.non_autenticato'),
      ('Non autorizzato', 'gmg.non_autorizzato'),
      ('Il tuo account è già collegato a un iscritto', 'gmg.account_gia_collegato'),
      ('Il nome è obbligatorio', 'gmg.nome_obbligatorio'),
      ('Il cognome è obbligatorio', 'gmg.cognome_obbligatorio'),
      ('Codice ref mancante', 'gmg.ref_mancante'),
      ('Codice ref % non trovato', 'gmg.ref_non_trovato:%'),
      ('Indirizzo email non valido', 'gmg.email_non_valida'),
      ('Importo del buono non valido', 'gmg.buono_importo_non_valido'),
      ('Città obbligatoria', 'gmg.citta_obbligatoria'),
      ('Data obbligatoria', 'gmg.data_obbligatoria'),
      ('Il carrello è vuoto', 'gmg.carrello_vuoto'),
      ('Nome destinatario obbligatorio', 'gmg.destinatario_obbligatorio'),
      ('Indirizzo obbligatorio', 'gmg.indirizzo_obbligatorio'),
      ('Paese obbligatorio', 'gmg.paese_obbligatorio'),
      ('CAP obbligatorio', 'gmg.cap_obbligatorio'),
      ('Prodotto % non trovato o non disponibile', 'gmg.prodotto_non_trovato:%'),
      ('Quantità non valida per il prodotto %', 'gmg.quantita_non_valida:%'),
      ('Codice buono non riconosciuto', 'gmg.buono_sconosciuto'),
      ('Questo buono e gia stato utilizzato', 'gmg.buono_gia_usato'),
      ('Questo buono e intestato a un altro indirizzo email', 'gmg.buono_altra_email'),
      ('Argomento obbligatorio', 'gmg.argomento_obbligatorio'),
      ('Messaggio obbligatorio', 'gmg.messaggio_obbligatorio'),
      ('Completa le informazioni del tuo profilo prima di richiedere un prelievo', 'gmg.profilo_incompleto'),
      ('L''importo minimo di prelievo è 10€', 'gmg.prelievo_sotto_minimo'),
      ('Nome banca e indirizzo obbligatori', 'gmg.banca_obbligatoria'),
      ('IBAN obbligatorio', 'gmg.iban_obbligatorio'),
      ('Importo superiore al saldo disponibile (% disponibili)', 'gmg.saldo_insufficiente:%'),
      ('Puoi iscrivere qualcuno solo sotto il tuo stesso codice', 'gmg.iscrizione_fuori_struttura'),
      ('Tipo documento non valido', 'gmg.documento_non_valido'),
      ('Oggetto obbligatorio', 'gmg.oggetto_obbligatorio'),
      ('Testo del messaggio obbligatorio', 'gmg.testo_obbligatorio'),
      ('Destinatario "%" non trovato', 'gmg.destinatario_non_trovato:%'),
      ('Evento % non trovato', 'gmg.evento_non_trovato:%')
    ) as v(vecchio, codice)
    loop
      nuovo := replace(nuovo, 'raise exception ' || quote_literal(c.vecchio),
                              'raise exception ' || quote_literal(c.codice));
    end loop;
    if nuovo <> def then
      execute nuovo; n := n + 1;
      raise notice 'riscritta %', f.proname;
    end if;
  end loop;
  raise notice 'funzioni riscritte: %', n;
end
$riscrittura$;