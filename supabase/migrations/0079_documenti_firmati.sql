-- DOCUMENTI FIRMATI
--
-- I documenti che l'incaricato compila davanti al cliente (contratto di
-- vendita VORTIX, informativa privacy, verbale di consegna) e il contratto
-- di incarico. Si compilano nel back office, si firmano col dito su tablet
-- o telefono, e il PDF che ne esce viene archiviato qui accanto ai CSV
-- delle esportazioni.
--
-- La firma raccolta e' una FIRMA ELETTRONICA SEMPLICE: non ha un
-- certificato, quindi il suo peso davanti a un giudice sta tutto nelle
-- prove che le mettiamo intorno (chi, quando, da quale indirizzo IP, con
-- quale dispositivo, e l'impronta del PDF firmato). Per questo ogni firma
-- ha una riga propria con i suoi dati, e il PDF ha il suo sha256: se il
-- file venisse ritoccato dopo, l'impronta non tornerebbe piu'.
--
-- Stesso schema del resto del progetto: nessuna policy di scrittura, si
-- scrive solo dalle funzioni SECURITY DEFINER qui sotto.

-- ---------------------------------------------------------------------
-- Numerazione progressiva
-- ---------------------------------------------------------------------
-- Un contatore per anno, non una sequence: le sequence non si riavvolgono
-- quando una transazione fallisce, quindi ogni prova andata male brucia un
-- numero d'ordine che il cliente vedrebbe mancare. Qui il numero torna
-- indietro insieme alla transazione che lo ha preso.
create table if not exists document_counters (
  anno integer primary key,
  ultimo integer not null default 0
);

alter table document_counters enable row level security;
-- Nessuna policy: ci accede solo assegna_numero_documento(), che e'
-- SECURITY DEFINER.

-- ---------------------------------------------------------------------
-- I documenti
-- ---------------------------------------------------------------------
create table if not exists signed_documents (
  id bigserial primary key,
  numero text not null unique,
  doc_type text not null check (doc_type in (
    'contratto_vendita', 'informativa_privacy', 'verbale_consegna', 'contratto_incaricato'
  )),

  -- Chi ha compilato il documento: l'incaricato che ha seguito la vendita.
  -- Per il contratto di incarico e' il firmatario stesso.
  owner_code integer not null references members (activity_code),
  -- Il cliente, se e' anche un membro a sistema. Spesso non lo e': chi
  -- compra VORTIX non per forza entra nella rete.
  client_code integer references members (activity_code),

  client_name text not null,
  client_email text,

  -- Tutti i campi del modulo, come sono stati compilati. In jsonb perche'
  -- i quattro documenti chiedono cose diverse e continueranno a cambiare:
  -- una colonna per campo vorrebbe dire una migrazione a ogni virgola
  -- spostata in un contratto.
  dati jsonb not null default '{}'::jsonb,

  stato text not null default 'bozza' check (stato in ('bozza', 'firmato', 'annullato')),

  -- Il PDF definitivo e la sua impronta.
  pdf_path text,
  pdf_sha256 text,
  signed_at timestamptz,

  created_at timestamptz not null default now()
);

create index if not exists signed_documents_owner_idx on signed_documents (owner_code);
create index if not exists signed_documents_client_idx on signed_documents (client_code);
create index if not exists signed_documents_created_idx on signed_documents (created_at desc);

alter table signed_documents enable row level security;

-- Chi l'ha fatto firmare, chi l'ha firmato (se e' a sistema) e l'azienda.
-- NON tutta la linea ascendente: dentro ci sono indirizzo, codice fiscale e
-- coordinate di pagamento del cliente, che sono dati personali suoi, non
-- materiale di rete come le provvigioni.
drop policy if exists signed_documents_select on signed_documents;
create policy signed_documents_select on signed_documents
  for select using (
    owner_code = current_member_code()
    or client_code = current_member_code()
    or current_member_code() = 0
  );

-- ---------------------------------------------------------------------
-- Le firme
-- ---------------------------------------------------------------------
create table if not exists document_signatures (
  id bigserial primary key,
  document_id bigint not null references signed_documents (id) on delete cascade,
  ruolo text not null check (ruolo in ('cliente', 'incaricato', 'tecnico')),
  firmatario text not null,
  -- immagine della firma nel bucket privato documenti-firmati
  image_path text not null,
  metodo text not null check (metodo in ('dispositivo', 'link')),
  signed_at timestamptz not null default now(),
  signed_ip text,
  signed_user_agent text,
  unique (document_id, ruolo)
);

create index if not exists document_signatures_document_idx on document_signatures (document_id);

alter table document_signatures enable row level security;

drop policy if exists document_signatures_select on document_signatures;
create policy document_signatures_select on document_signatures
  for select using (
    exists (
      select 1 from signed_documents d
      where d.id = document_signatures.document_id
        and (
          d.owner_code = current_member_code()
          or d.client_code = current_member_code()
          or current_member_code() = 0
        )
    )
  );

-- ---------------------------------------------------------------------
-- Link di firma a distanza
-- ---------------------------------------------------------------------
-- Quando il cliente firma dal proprio telefono invece che dal tablet
-- dell'incaricato. Il link da solo non basta: chi lo apre riceve un codice
-- via email e deve digitarlo, altrimenti chiunque intercetti l'indirizzo
-- potrebbe firmare al posto suo.
--
-- Nessuna policy di lettura: questa tabella la tocca solo il server con la
-- service role key, dalla pagina pubblica di firma. Il codice non si salva
-- in chiaro, si salva la sua impronta.
create table if not exists document_sign_links (
  token text primary key,
  document_id bigint not null references signed_documents (id) on delete cascade,
  ruolo text not null check (ruolo in ('cliente', 'tecnico')),
  email text not null,
  otp_hash text,
  otp_expires_at timestamptz,
  tentativi integer not null default 0,
  used_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists document_sign_links_document_idx on document_sign_links (document_id);

alter table document_sign_links enable row level security;
-- Nessuna policy, di proposito: né anon né authenticated devono poter
-- leggere i token di qualcun altro.

-- ---------------------------------------------------------------------
-- Funzioni
-- ---------------------------------------------------------------------
create or replace function assegna_numero_documento()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  anno_corrente integer := extract(year from (now() at time zone 'Europe/Rome'))::integer;
  progressivo integer;
begin
  insert into document_counters (anno, ultimo)
  values (anno_corrente, 1)
  on conflict (anno) do update set ultimo = document_counters.ultimo + 1
  returning ultimo into progressivo;

  return format('GMG-%s-%s', anno_corrente, lpad(progressivo::text, 4, '0'));
end;
$$;

revoke all on function assegna_numero_documento() from public, anon, authenticated;

create or replace function crea_documento(
  p_doc_type text,
  p_client_name text,
  p_client_email text,
  p_client_code integer,
  p_dati jsonb
)
returns signed_documents
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  creato signed_documents;
begin
  if caller is null then
    raise exception 'Devi essere autenticato per creare un documento';
  end if;

  if p_doc_type not in ('contratto_vendita', 'informativa_privacy', 'verbale_consegna', 'contratto_incaricato') then
    raise exception 'Tipo di documento non valido';
  end if;

  if coalesce(btrim(p_client_name), '') = '' then
    raise exception 'Il nome di chi firma e'' obbligatorio';
  end if;

  insert into signed_documents (
    numero, doc_type, owner_code, client_code, client_name, client_email, dati
  ) values (
    assegna_numero_documento(),
    p_doc_type,
    caller,
    p_client_code,
    btrim(p_client_name),
    nullif(btrim(p_client_email), ''),
    coalesce(p_dati, '{}'::jsonb)
  )
  returning * into creato;

  return creato;
end;
$$;

revoke all on function crea_documento(text, text, text, integer, jsonb) from public, anon;
grant execute on function crea_documento(text, text, text, integer, jsonb) to authenticated;

create or replace function aggiungi_firma_documento(
  p_document_id bigint,
  p_ruolo text,
  p_firmatario text,
  p_image_path text,
  p_metodo text,
  p_signed_ip text default null,
  p_signed_user_agent text default null
)
returns document_signatures
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  doc signed_documents;
  firma document_signatures;
begin
  if caller is null then
    raise exception 'Devi essere autenticato per firmare';
  end if;

  select * into doc from signed_documents where id = p_document_id;
  if doc is null then
    raise exception 'Documento non trovato';
  end if;
  if doc.owner_code <> caller and caller <> 0 then
    raise exception 'Non puoi firmare un documento di qualcun altro';
  end if;
  if doc.stato <> 'bozza' then
    raise exception 'Il documento e'' gia'' chiuso: non si possono aggiungere firme';
  end if;

  insert into document_signatures (
    document_id, ruolo, firmatario, image_path, metodo, signed_ip, signed_user_agent
  ) values (
    p_document_id, p_ruolo, btrim(p_firmatario), p_image_path, p_metodo, p_signed_ip, p_signed_user_agent
  )
  on conflict (document_id, ruolo) do update set
    firmatario = excluded.firmatario,
    image_path = excluded.image_path,
    metodo = excluded.metodo,
    signed_at = now(),
    signed_ip = excluded.signed_ip,
    signed_user_agent = excluded.signed_user_agent
  returning * into firma;

  return firma;
end;
$$;

revoke all on function aggiungi_firma_documento(bigint, text, text, text, text, text, text) from public, anon;
grant execute on function aggiungi_firma_documento(bigint, text, text, text, text, text, text) to authenticated;

-- Chiude il documento: da qui in poi non si aggiungono piu' firme e il PDF
-- archiviato e' quello la cui impronta e' registrata qui.
create or replace function chiudi_documento(
  p_document_id bigint,
  p_pdf_path text,
  p_pdf_sha256 text
)
returns signed_documents
language plpgsql
security definer
set search_path = public
as $$
declare
  caller integer := current_member_code();
  doc signed_documents;
begin
  if caller is null then
    raise exception 'Devi essere autenticato';
  end if;

  select * into doc from signed_documents where id = p_document_id;
  if doc is null then
    raise exception 'Documento non trovato';
  end if;
  if doc.owner_code <> caller and caller <> 0 then
    raise exception 'Non puoi chiudere un documento di qualcun altro';
  end if;

  update signed_documents set
    pdf_path = p_pdf_path,
    pdf_sha256 = p_pdf_sha256,
    stato = 'firmato',
    signed_at = coalesce(signed_at, now())
  where id = p_document_id
  returning * into doc;

  return doc;
end;
$$;

revoke all on function chiudi_documento(bigint, text, text) from public, anon;
grant execute on function chiudi_documento(bigint, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------
-- Bucket privato: dentro ci sono contratti firmati con dati personali.
-- Si legge solo con un link temporaneo generato dal server, mai da un
-- indirizzo pubblico. Le cartelle sono intestate al codice dell'incaricato,
-- come per i documenti KYC.
insert into storage.buckets (id, name, public)
values ('documenti-firmati', 'documenti-firmati', false)
on conflict (id) do nothing;

drop policy if exists documenti_firmati_select on storage.objects;
create policy documenti_firmati_select on storage.objects
  for select using (
    bucket_id = 'documenti-firmati'
    and (
      current_member_code() = 0
      or (storage.foldername(name))[1] = current_member_code()::text
    )
  );

drop policy if exists documenti_firmati_insert on storage.objects;
create policy documenti_firmati_insert on storage.objects
  for insert with check (
    bucket_id = 'documenti-firmati'
    and (storage.foldername(name))[1] = current_member_code()::text
  );

drop policy if exists documenti_firmati_update on storage.objects;
create policy documenti_firmati_update on storage.objects
  for update using (
    bucket_id = 'documenti-firmati'
    and (storage.foldername(name))[1] = current_member_code()::text
  );

comment on table signed_documents is
  'Documenti compilati nel back office e firmati col dito: contratto di vendita, informativa, verbale di consegna, contratto incaricato.';
comment on column signed_documents.pdf_sha256 is
  'Impronta del PDF archiviato: serve a dimostrare che il file non e'' stato modificato dopo la firma.';
