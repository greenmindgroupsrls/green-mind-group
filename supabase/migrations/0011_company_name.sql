-- Aggiunge ragione sociale (rilevante solo per account_type='company').
-- Stesso avvertimento delle migration precedenti: drop esplicito della
-- firma precedente prima di ricreare upsert_own_profile con un parametro
-- in più, altrimenti resta vivo un overload con i grant di default.

alter table member_profiles add column if not exists company_name text;

drop function if exists upsert_own_profile(text, text, date, text, text, text, text, text, text, text, text, text, text);

create or replace function upsert_own_profile(
  p_account_type text default null,
  p_country text default null,
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

  insert into member_profiles (activity_code, account_type, country, date_of_birth,
    phone_country_code, phone_number, personal_domain, tax_id, currency, timezone,
    about, linkedin_url, facebook_url, instagram_url, company_name)
  values (caller, coalesce(p_account_type, 'individual'), p_country, p_date_of_birth,
    p_phone_country_code, p_phone_number, p_personal_domain, p_tax_id,
    coalesce(p_currency, 'EUR'), coalesce(p_timezone, 'Europe/Rome'),
    p_about, p_linkedin_url, p_facebook_url, p_instagram_url, p_company_name)
  on conflict (activity_code) do update set
    account_type = coalesce(p_account_type, member_profiles.account_type),
    country = coalesce(p_country, member_profiles.country),
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

revoke all on function upsert_own_profile(text, text, date, text, text, text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function upsert_own_profile(text, text, date, text, text, text, text, text, text, text, text, text, text, text) to authenticated;
