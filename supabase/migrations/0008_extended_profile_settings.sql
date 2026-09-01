-- Impostazioni estese: profilo, indirizzi, documenti KYC. Tabelle separate da
-- members (che resta snella e centrata su rete/commissioni) per isolare dati
-- personali/sensibili con una regola di privacy diversa: qui ognuno vede e
-- modifica SOLO il proprio record, tranne l'azienda (activity_code 0) che
-- vede tutto (serve per validare KYC). Non "il mio sotto-albero" come per
-- members/sales/commission_entries — un upline non deve vedere l'indirizzo
-- di casa o i documenti di un suo downline.

create table if not exists member_profiles (
  activity_code integer primary key references members (activity_code),
  account_type text not null default 'individual' check (account_type in ('individual', 'company')),
  country text,
  date_of_birth date,
  phone_country_code text,
  phone_number text,
  personal_domain text unique,
  tax_id text,
  currency text not null default 'EUR',
  timezone text not null default 'Europe/Rome',
  about text,
  linkedin_url text,
  facebook_url text,
  instagram_url text,
  updated_at timestamptz not null default now()
);

create table if not exists member_addresses (
  id bigint generated always as identity primary key,
  activity_code integer not null references members (activity_code),
  recipient_name text not null,
  street text not null,
  city text not null,
  region text,
  country text not null,
  postal_code text not null,
  phone text,
  type text not null check (type in ('shipping', 'billing')),
  created_at timestamptz not null default now()
);

create index if not exists member_addresses_activity_code_idx on member_addresses (activity_code);

create table if not exists member_kyc_documents (
  id bigint generated always as identity primary key,
  activity_code integer not null references members (activity_code),
  doc_type text not null check (doc_type in ('id_proof', 'utility_bill', 'account_statement')),
  storage_path text not null,
  uploaded_at timestamptz not null default now(),
  unique (activity_code, doc_type)
);

create index if not exists member_kyc_documents_activity_code_idx on member_kyc_documents (activity_code);

alter table member_profiles enable row level security;
alter table member_addresses enable row level security;
alter table member_kyc_documents enable row level security;

create policy member_profiles_select on member_profiles
  for select using (current_member_code() = activity_code or current_member_code() = 0);

create policy member_addresses_select on member_addresses
  for select using (current_member_code() = activity_code or current_member_code() = 0);

create policy member_kyc_documents_select on member_kyc_documents
  for select using (current_member_code() = activity_code or current_member_code() = 0);

-- Upsert del proprio profilo: ogni parametro NULL lascia invariato il valore
-- esistente (aggiornamento parziale), tranne al primo salvataggio dove la
-- riga non esiste ancora e viene creata.
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

create or replace function add_own_address(
  p_recipient_name text,
  p_street text,
  p_city text,
  p_region text,
  p_country text,
  p_postal_code text,
  p_phone text,
  p_type text
)
returns member_addresses
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  result member_addresses;
begin
  if caller is null then
    raise exception 'Devi essere autenticato per salvare un indirizzo';
  end if;
  if p_type not in ('shipping', 'billing') then
    raise exception 'Tipo indirizzo non valido';
  end if;

  insert into member_addresses (activity_code, recipient_name, street, city, region, country, postal_code, phone, type)
  values (caller, p_recipient_name, p_street, p_city, p_region, p_country, p_postal_code, p_phone, p_type)
  returning * into result;

  return result;
end;
$$;

create or replace function delete_own_address(p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
begin
  if caller is null then
    raise exception 'Devi essere autenticato';
  end if;

  delete from member_addresses where id = p_id and activity_code = caller;
end;
$$;

-- Registra il riferimento al file gia' caricato su Storage (upload fatto dal
-- client con le sue stesse credenziali, protetto dalle policy sul bucket).
create or replace function register_kyc_document(p_doc_type text, p_storage_path text)
returns member_kyc_documents
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  result member_kyc_documents;
begin
  if caller is null then
    raise exception 'Devi essere autenticato per caricare un documento';
  end if;
  if p_doc_type not in ('id_proof', 'utility_bill', 'account_statement') then
    raise exception 'Tipo documento non valido';
  end if;

  insert into member_kyc_documents (activity_code, doc_type, storage_path)
  values (caller, p_doc_type, p_storage_path)
  on conflict (activity_code, doc_type) do update set
    storage_path = p_storage_path,
    uploaded_at = now()
  returning * into result;

  return result;
end;
$$;

revoke all on function upsert_own_profile(text, text, date, text, text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function upsert_own_profile(text, text, date, text, text, text, text, text, text, text, text, text, text) to authenticated;

revoke all on function add_own_address(text, text, text, text, text, text, text, text) from public, anon;
grant execute on function add_own_address(text, text, text, text, text, text, text, text) to authenticated;

revoke all on function delete_own_address(bigint) from public, anon;
grant execute on function delete_own_address(bigint) to authenticated;

revoke all on function register_kyc_document(text, text) from public, anon;
grant execute on function register_kyc_document(text, text) to authenticated;

-- Bucket privato per i documenti KYC: ognuno carica/legge solo dentro la
-- propria cartella "<activity_code>/...", l'azienda (0) legge tutto.
insert into storage.buckets (id, name, public)
values ('kyc-documents', 'kyc-documents', false)
on conflict (id) do nothing;

create policy kyc_documents_own_select on storage.objects
  for select using (
    bucket_id = 'kyc-documents'
    and (
      current_member_code() = 0
      or (storage.foldername(name))[1] = current_member_code()::text
    )
  );

create policy kyc_documents_own_insert on storage.objects
  for insert with check (
    bucket_id = 'kyc-documents'
    and (storage.foldername(name))[1] = current_member_code()::text
  );

create policy kyc_documents_own_update on storage.objects
  for update using (
    bucket_id = 'kyc-documents'
    and (storage.foldername(name))[1] = current_member_code()::text
  );
