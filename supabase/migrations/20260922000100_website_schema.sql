-- The website's submission tables, as they stand in the live website project
-- (ref ajauxndpqllrsfivvurj) on 22 September 2026.
--
-- Until now the schema lived only in the database. It was created by two
-- migrations applied through the dashboard — 20260908203526
-- initial_website_schema and 20260909155022 harden_functions_and_seed_counties
-- — and read back for this file from information_schema, pg_constraint,
-- pg_indexes, pg_trigger, pg_policies and storage.buckets, so that the
-- submission tables are written down somewhere other than the database.
--
-- It is not a full baseline. It depends on public.locations (whose slug the
-- county columns reference), and the reviews tables, which this file does not
-- create, so a fresh database cannot be built from the repository alone yet.
-- The remote migration history also carries seven versions (20260908203526
-- through 20260920191912) that have no file here, and `supabase db push` will
-- refuse until they are reconciled — `supabase migration fetch`, or
-- `supabase migration repair` for each. Until then, apply these files through
-- the SQL editor, in order.
--
-- Written to be safe to run against the live project, where every object
-- already exists: each statement creates only what is missing.
--
-- The anon INSERT policies are recorded here as they are live, and dropped by
-- 20260922000300_drop_anon_insert_policies.sql.

create extension if not exists "pgcrypto";

-- Trigger helpers ---------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Stamps a document's purge date on arrival when the insert did not set one.
-- The website sets it itself (lib/documents.ts RETENTION_DAYS, also 90), and
-- the daily purge in app/api/cron/purge acts on it.
create or replace function public.set_document_purge_date()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.purge_after is null then
    new.purge_after := (new.uploaded_at + interval '90 days')::date;
  end if;
  return new;
end;
$$;

-- Never callable over PostgREST.
revoke execute on function public.set_updated_at() from anon, authenticated, public;
revoke execute on function public.set_document_purge_date() from anon, authenticated, public;

-- Enums -------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'lead_source' and typnamespace = 'public'::regnamespace) then
    create type public.lead_source as enum ('quote', 'contact', 'partner', 'calculator', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'lead_status' and typnamespace = 'public'::regnamespace) then
    create type public.lead_status as enum ('new', 'contacted', 'quoted', 'won', 'lost', 'spam');
  end if;
  if not exists (select 1 from pg_type where typname = 'order_status' and typnamespace = 'public'::regnamespace) then
    create type public.order_status as enum (
      'received', 'opened', 'search_ordered', 'commitment_issued',
      'clearing', 'clear_to_close', 'scheduled', 'closed', 'cancelled'
    );
  end if;
end;
$$;

-- Leads -------------------------------------------------------------------

create table if not exists public.leads (
  id               uuid primary key default gen_random_uuid(),
  source           public.lead_source not null default 'quote',
  status           public.lead_status not null default 'new',
  full_name        text not null,
  email            text,
  phone            text,
  role             text,
  property_address text,
  county_slug      text constraint leads_county_slug_fkey references public.locations(slug),
  transaction_type text,
  purchase_price   numeric(14,2),
  loan_amount      numeric(14,2),
  message          text,
  heard_about_us   text,
  page_path        text,
  utm              jsonb,
  ip_hash          text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);

create or replace trigger leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

-- Orders ------------------------------------------------------------------

create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  reference           text constraint orders_reference_key unique,
  status              public.order_status not null default 'received',
  ordered_by_name     text not null,
  ordered_by_email    text not null,
  ordered_by_phone    text,
  ordered_by_role     text,
  buyer_name          text,
  seller_name         text,
  property_address    text not null,
  county_slug         text constraint orders_county_slug_fkey references public.locations(slug),
  parcel_id           text,
  transaction_type    text,
  purchase_price      numeric(14,2),
  loan_amount         numeric(14,2),
  lender_name         text,
  lender_contact      text,
  closing_date_target date,
  closing_method      text,
  notes               text,
  page_path           text,
  ip_hash             text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);

create or replace trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- Order documents ---------------------------------------------------------

create table if not exists public.order_documents (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null constraint order_documents_order_id_fkey
                  references public.orders(id) on delete cascade,
  storage_path  text not null,
  original_name text not null,
  mime_type     text,
  size_bytes    bigint,
  uploaded_at   timestamptz not null default now(),
  purge_after   date
);

create index if not exists order_documents_order_id_idx on public.order_documents (order_id);
create index if not exists order_documents_purge_after_idx on public.order_documents (purge_after);

create or replace trigger order_documents_purge_date before insert on public.order_documents
  for each row execute function public.set_document_purge_date();

-- Row-level security ------------------------------------------------------
--
-- The website writes and reads only with the service role, which bypasses
-- RLS. With RLS on and no SELECT policy, anon and authenticated can read
-- nothing, whatever the table grants say.

alter table public.leads           enable row level security;
alter table public.orders          enable row level security;
alter table public.order_documents enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'leads'
                 and policyname = 'anon can submit a lead') then
    create policy "anon can submit a lead"
      on public.leads for insert to anon, authenticated
      with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'orders'
                 and policyname = 'anon can submit an order') then
    create policy "anon can submit an order"
      on public.orders for insert to anon, authenticated
      with check (true);
  end if;
end;
$$;

revoke select on public.leads  from anon, authenticated;
revoke select on public.orders from anon, authenticated;

comment on table public.leads is 'Public form submissions. anon may INSERT only; never SELECT.';
comment on table public.orders is 'Title orders from the website. anon may INSERT only; never SELECT. Distinct from the production system order tables.';
comment on table public.order_documents is 'Metadata only. Files live in the private order-documents storage bucket. Default retention 90 days - confirm with counsel and First American.';

-- Storage -----------------------------------------------------------------
--
-- Private, 25 MB per object (26214400 bytes), and only the types
-- lib/documents.ts accepts. There are no storage.objects policies: the
-- browser writes through signed upload URLs the server mints, and nothing is
-- ever read without the service role.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-documents',
  'order-documents',
  false,
  26214400,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/heic',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict (id) do nothing;
