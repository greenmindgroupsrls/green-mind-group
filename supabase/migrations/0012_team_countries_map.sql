-- Mappa "Affiliate Joinings" in dashboard: bisogna sapere in quali paesi si
-- trova il PROPRIO team, cosa che member_profiles non permette (solo se
-- stesso o l'azienda). Stessa soluzione già usata per l'avatar: il country
-- esce da member_profiles e va in una tabella dedicata — ma qui la policy è
-- "il mio sotto-albero" (is_self_or_descendant), non aperta a tutti come gli
-- avatar, perché è comunque un dato pensato per la reportistica del proprio
-- team, non per essere pubblico all'intera rete.

create table if not exists member_countries (
  activity_code integer primary key references members (activity_code),
  country text,
  updated_at timestamptz not null default now()
);

alter table member_countries enable row level security;

create policy member_countries_select on member_countries
  for select using (is_self_or_descendant(current_member_code(), activity_code));

create or replace function set_own_country(p_country text)
returns member_countries
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  result member_countries;
begin
  if caller is null then
    raise exception 'Devi essere autenticato per aggiornare il paese';
  end if;

  insert into member_countries (activity_code, country)
  values (caller, p_country)
  on conflict (activity_code) do update set
    country = excluded.country,
    updated_at = now()
  returning * into result;

  return result;
end;
$$;

revoke all on function set_own_country(text) from public, anon;
grant execute on function set_own_country(text) to authenticated;

-- Rimuove country da member_profiles: ora vive solo in member_countries.
-- Stesso drop esplicito del solito per l'overload di upsert_own_profile.
drop function if exists upsert_own_profile(text, text, date, text, text, text, text, text, text, text, text, text, text, text);

create or replace function upsert_own_profile(
  p_account_type text default null,
  p_date_of_birth date default null,
  p_phone_country_code text default null,
  p_phone_number text default null,
  p_personal_domain text default null,
  p_tax_id text default null,
  p_currency text default null,
  p_timezone text default null,
  p_about text default null,
  p_linkedin_url text default null,
  p_facebook_url text default null,
  p_instagram_url text default null,
  p_company_name text default null
)
returns member_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  result member_profiles;
begin
  if caller is null then
    raise exception 'Devi essere autenticato per aggiornare il profilo';
  end if;

  insert into member_profiles (activity_code, account_type, date_of_birth,
    phone_country_code, phone_number, personal_domain, tax_id, currency, timezone,
    about, linkedin_url, facebook_url, instagram_url, company_name)
  values (caller, coalesce(p_account_type, 'individual'), p_date_of_birth,
    p_phone_country_code, p_phone_number, p_personal_domain, p_tax_id,
    coalesce(p_currency, 'EUR'), coalesce(p_timezone, 'Europe/Rome'),
    p_about, p_linkedin_url, p_facebook_url, p_instagram_url, p_company_name)
  on conflict (activity_code) do update set
    account_type = coalesce(p_account_type, member_profiles.account_type),
    date_of_birth = coalesce(p_date_of_birth, member_profiles.date_of_birth),
    phone_country_code = coalesce(p_phone_country_code, member_profiles.phone_country_code),
    phone_number = coalesce(p_phone_number, member_profiles.phone_number),
    personal_domain = coalesce(p_personal_domain, member_profiles.personal_domain),
    tax_id = coalesce(p_tax_id, member_profiles.tax_id),
    currency = coalesce(p_currency, member_profiles.currency),
    timezone = coalesce(p_timezone, member_profiles.timezone),
    about = coalesce(p_about, member_profiles.about),
    linkedin_url = coalesce(p_linkedin_url, member_profiles.linkedin_url),
    facebook_url = coalesce(p_facebook_url, member_profiles.facebook_url),
    instagram_url = coalesce(p_instagram_url, member_profiles.instagram_url),
    company_name = coalesce(p_company_name, member_profiles.company_name),
    updated_at = now()
  returning * into result;

  return result;
end;
$$;

revoke all on function upsert_own_profile(text, date, text, text, text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function upsert_own_profile(text, date, text, text, text, text, text, text, text, text, text, text, text) to authenticated;

alter table member_profiles drop column if exists country;
