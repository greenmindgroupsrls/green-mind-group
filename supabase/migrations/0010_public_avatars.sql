-- La foto profilo deve essere visibile anche ad altri (albero rete, sidebar
-- di chi la guarda), a differenza del resto di member_profiles (indirizzo,
-- KYC, telefono, data di nascita — quello resta privato: solo se stesso o
-- l'azienda). RLS non permette policy per singola colonna su una tabella,
-- quindi l'avatar si sposta in una tabella dedicata con lettura aperta a
-- chiunque sia autenticato, invece di allentare member_profiles per intero.
-- Lo storage bucket 'avatars' era già pubblico in lettura (vedi 0009); qui
-- allineiamo anche la tabella che ne referenzia il path.

create table if not exists member_avatars (
  activity_code integer primary key references members (activity_code),
  avatar_url text,
  updated_at timestamptz not null default now()
);

alter table member_avatars enable row level security;

create policy member_avatars_select_all on member_avatars
  for select using (true);

create or replace function set_own_avatar(p_avatar_url text)
returns member_avatars
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  result member_avatars;
begin
  if caller is null then
    raise exception 'Devi essere autenticato per aggiornare la foto profilo';
  end if;

  insert into member_avatars (activity_code, avatar_url)
  values (caller, p_avatar_url)
  on conflict (activity_code) do update set
    avatar_url = excluded.avatar_url,
    updated_at = now()
  returning * into result;

  return result;
end;
$$;

revoke all on function set_own_avatar(text) from public, anon;
grant execute on function set_own_avatar(text) to authenticated;

-- Rimuove avatar_url da member_profiles: ora vive solo in member_avatars,
-- niente doppia scrittura da tenere sincronizzata. Drop esplicito del
-- vecchio overload a 14 argomenti prima di ricreare quello a 13 — altrimenti
-- resterebbero entrambi vivi (vedi nota in 0009 sullo stesso problema).
drop function if exists upsert_own_profile(text, text, date, text, text, text, text, text, text, text, text, text, text, text);

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
  p_instagram_url text default null
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
    about, linkedin_url, facebook_url, instagram_url)
  values (caller, coalesce(p_account_type, 'individual'), p_country, p_date_of_birth,
    p_phone_country_code, p_phone_number, p_personal_domain, p_tax_id,
    coalesce(p_currency, 'EUR'), coalesce(p_timezone, 'Europe/Rome'),
    p_about, p_linkedin_url, p_facebook_url, p_instagram_url)
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
    updated_at = now()
  returning * into result;

  return result;
end;
$$;

revoke all on function upsert_own_profile(text, text, date, text, text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function upsert_own_profile(text, text, date, text, text, text, text, text, text, text, text, text, text) to authenticated;

alter table member_profiles drop column if exists avatar_url;
