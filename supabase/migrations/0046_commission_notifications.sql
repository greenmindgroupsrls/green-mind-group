-- Notifica in-app (stesso inbox messaggi che alimenta gia' la campanella)
-- per ogni beneficiario che guadagna una commissione da una vendita — oggi
-- non lasciava traccia da nessuna parte, ne' email ne' messaggio. Stesso
-- pattern di notify_root: insert diretta su messages, mittente il
-- venditore che ha generato la vendita.
create or replace function register_sale(p_seller_code integer, p_quantity integer)
returns sales
language plpgsql
security definer
set search_path = public
as $$
declare
  seller members;
  new_sale sales;
  level1_code integer;
  level2_code integer;
  level3_code integer;
  level1_rank text;
  level2_rank text;
  level3_rank text;
  rates compensation_settings;
  seller_username text;
  amount numeric;
begin
  if p_seller_code <> current_member_code() then
    raise exception 'Puoi registrare una vendita solo per conto tuo';
  end if;

  if p_quantity <= 0 then
    raise exception 'La quantita deve essere maggiore di zero';
  end if;

  select * into seller from members where activity_code = p_seller_code;
  if seller is null then
    raise exception 'Codice venditore % non trovato', p_seller_code;
  end if;

  select * into rates from compensation_settings where id = 1;
  seller_username := seller.username;

  insert into sales (seller_code, quantity) values (p_seller_code, p_quantity)
  returning * into new_sale;

  if seller.role <> 'cliente' then
    amount := p_quantity * rates.level0_rate;
    insert into commission_entries (sale_id, beneficiary_code, level, amount)
    values (new_sale.id, p_seller_code, 0, amount);

    insert into messages (sender_code, sender_username, recipient_code, recipient_username, subject, body)
    values (p_seller_code, seller_username, p_seller_code, seller_username,
      'Nuova commissione guadagnata',
      format('Hai guadagnato %s€ dalla tua vendita di %s pezzi.', amount, p_quantity));
  end if;

  level1_code := seller.parent_code;
  if level1_code is not null then
    select rank into level1_rank from compute_member_ranks() where activity_code = level1_code;
    if level1_rank in ('vip', 'royal') then
      amount := p_quantity * rates.level1_rate;
      insert into commission_entries (sale_id, beneficiary_code, level, amount)
      values (new_sale.id, level1_code, 1, amount);

      insert into messages (sender_code, sender_username, recipient_code, recipient_username, subject, body)
      select p_seller_code, seller_username, level1_code, m.username,
        'Nuova commissione guadagnata',
        format('Hai guadagnato %s€ da una vendita di %s (%s pezzi) nella tua rete.', amount, seller_username, p_quantity)
      from members m where m.activity_code = level1_code;
    end if;

    select parent_code into level2_code from members where activity_code = level1_code;
    if level2_code is not null then
      select rank into level2_rank from compute_member_ranks() where activity_code = level2_code;
      if level2_rank in ('vip', 'royal') then
        amount := p_quantity * rates.level2_rate;
        insert into commission_entries (sale_id, beneficiary_code, level, amount)
        values (new_sale.id, level2_code, 2, amount);

        insert into messages (sender_code, sender_username, recipient_code, recipient_username, subject, body)
        select p_seller_code, seller_username, level2_code, m.username,
          'Nuova commissione guadagnata',
          format('Hai guadagnato %s€ da una vendita di %s (%s pezzi) nella tua rete.', amount, seller_username, p_quantity)
        from members m where m.activity_code = level2_code;
      end if;

      select parent_code into level3_code from members where activity_code = level2_code;
      if level3_code is not null then
        select rank into level3_rank from compute_member_ranks() where activity_code = level3_code;
        if level3_rank = 'royal' then
          amount := p_quantity * rates.level3_rate;
          insert into commission_entries (sale_id, beneficiary_code, level, amount)
          values (new_sale.id, level3_code, 3, amount);

          insert into messages (sender_code, sender_username, recipient_code, recipient_username, subject, body)
          select p_seller_code, seller_username, level3_code, m.username,
            'Nuova commissione guadagnata',
            format('Hai guadagnato %s€ da una vendita di %s (%s pezzi) nella tua rete.', amount, seller_username, p_quantity)
          from members m where m.activity_code = level3_code;
        end if;
      end if;
    end if;
  end if;

  return new_sale;
end;
$$;
