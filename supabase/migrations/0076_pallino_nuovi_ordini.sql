-- IL PALLINO ROSSO SUGLI ORDINI
--
-- Un ordine che arriva non avvisa nessuno: bisogna ricordarsi di andare a
-- guardare. Serve un pallino sul menu, e perche' un pallino si spenga
-- bisogna sapere quando quella pagina e' stata aperta l'ultima volta.
--
-- Non basta contare gli ordini "in attesa": quello e' il lavoro da fare, non
-- la novita'. Un ordine gia' visto ma non ancora spedito continuerebbe a
-- lampeggiare per giorni, e un pallino che non si spegne mai diventa un
-- pallino che non si guarda piu'.
--
-- La tabella e' generica apposta (una chiave, non una colonna "ordini"):
-- il giorno che servira' un pallino sui lead o sui ticket, si aggiunge una
-- riga invece di una migrazione.

create table if not exists public.stato_visualizzazione (
  activity_code integer not null references public.members(activity_code) on delete cascade,
  chiave text not null,
  visto_il timestamptz not null default now(),
  primary key (activity_code, chiave)
);

alter table public.stato_visualizzazione enable row level security;

-- Ognuno vede e scrive solo il proprio segnalibro.
drop policy if exists stato_visualizzazione_proprio on public.stato_visualizzazione;
create policy stato_visualizzazione_proprio on public.stato_visualizzazione
  for all
  using (activity_code = current_member_code())
  with check (activity_code = current_member_code());

-- Segna "ho guardato adesso". La chiama la pagina quando viene aperta.
create or replace function public.segna_visto(p_chiave text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  chiamante integer := current_member_code();
begin
  if chiamante is null then
    raise exception 'Non autorizzato';
  end if;

  insert into stato_visualizzazione (activity_code, chiave, visto_il)
  values (chiamante, p_chiave, now())
  on conflict (activity_code, chiave) do update set visto_il = now();
end;
$function$;

revoke all on function public.segna_visto(text) from public, anon;
grant execute on function public.segna_visto(text) to authenticated;

-- Quanti ordini sono arrivati da quando li ho guardati l'ultima volta.
-- Solo l'account aziendale: e' l'unico che vede la voce nel menu.
--
-- Chi non ha mai aperto la pagina non si vede addosso lo storico di tutti
-- gli ordini mai ricevuti: la prima volta il segnalibro non c'e', e si
-- conta da quando l'account e' stato creato in poi, che per l'azienda
-- significa comunque "tutti" ma senza sorprese per account nuovi.
create or replace function public.nuovi_ordini()
returns integer
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  chiamante integer := current_member_code();
  ultima timestamptz;
begin
  if chiamante is null or chiamante <> 0 then
    return 0;
  end if;

  select visto_il into ultima
  from stato_visualizzazione
  where activity_code = chiamante and chiave = 'ordini';

  return (
    select count(*)
    from shop_orders
    where ultima is null or created_at > ultima
  );
end;
$function$;

revoke all on function public.nuovi_ordini() from public, anon;
grant execute on function public.nuovi_ordini() to authenticated;
