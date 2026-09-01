-- Fatturato totale scoped al sotto-albero senza esporre gli ordini
-- individuali (che contengono indirizzo/telefono di spedizione reali):
-- una funzione che restituisce solo la somma aggregata, non le righe.
create or replace function network_revenue()
returns numeric
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(sum(total_amount), 0)
  from shop_orders
  where status <> 'cancelled'
    and is_self_or_descendant(current_member_code(), buyer_code);
$$;

revoke all on function network_revenue() from public, anon;
grant execute on function network_revenue() to authenticated;
