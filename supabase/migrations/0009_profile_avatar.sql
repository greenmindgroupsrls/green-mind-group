-- Foto profilo: campo su member_profiles + bucket pubblico in lettura
-- (le avatar sono mostrate anche ad altri, es. nell'albero rete), ma
-- scrivibili solo dal proprietario della propria cartella "<activity_code>/".

alter table member_profiles add column if not exists avatar_url text;

-- create or replace NON basta qui: aggiungere un parametro crea un nuovo
-- overload (Postgres distingue le funzioni per nome+tipi argomenti), quindi
-- va droppata esplicitamente la firma precedente a 13 argomenti, altrimenti
-- resta viva con i suoi permessi e il nuovo overload a 14 nasce con i grant
-- di default della piattaforma (anon incluso) invece di ereditare quelli
-- ristretti che avevamo impostato.
drop function if exists upsert_own_profile(text, text, date, text, text, text, text, text, text, text, text, text, text);

-- p_avatar_url si aggiunge in coda con default null: retrocompatibile con
-- le chiamate esistenti (che non lo passano e lasciano invariato il valore).
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
  p_avatar_url text default null
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
    about, linkedin_url, facebook_url, instagram_url, avatar_url)
  values (caller, coalesce(p_account_type, 'individual'), p_country, p_date_of_birth,
    p_phone_country_code, p_phone_number, p_personal_domain, p_tax_id,
    coalesce(p_currency, 'EUR'), coalesce(p_timezone, 'Europe/Rome'),
    p_about, p_linkedin_url, p_facebook_url, p_instagram_url, p_avatar_url)
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
    avatar_url = coalesce(p_avatar_url, member_profiles.avatar_url),
    updated_at = now()
  returning * into result;

  return result;
end;
$$;

revoke all on function upsert_own_profile(text, text, date, text, text, text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function upsert_own_profile(text, text, date, text, text, text, text, text, text, text, text, text, text, text) to authenticated;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy avatars_public_select on storage.objects
  for select using (bucket_id = 'avatars');

create policy avatars_own_insert on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = current_member_code()::text
  );

create policy avatars_own_update on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = current_member_code()::text
  );
