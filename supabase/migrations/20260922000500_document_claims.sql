-- One row per document the office has been sent, so a page is emailed once.
--
-- A contract sent for pricing has no table of its own: the lead is the record
-- and the bucket folder holds the pages. Whether the office had already been
-- sent a page was read off the lead's updated_at, which anything moves — the
-- office marking the lead contacted was enough to make a page that arrived a
-- minute later look sent, and it was left out of the email. A row per page,
-- keyed on its path, makes "already sent" a fact rather than an inference, and
-- makes claiming a page atomic: two confirmations arriving together cannot
-- both insert the same path, so they cannot both email it.
--
-- order_documents gets the same guarantee. It already has a row per document,
-- but nothing stopped two confirmations in flight together from writing the
-- same path twice.
--
-- Safe to run against the live project: both tables are empty.

create table if not exists public.quote_documents (
  storage_path text primary key,
  lead_id      uuid not null constraint quote_documents_lead_id_fkey
                 references public.leads(id) on delete cascade,
  size_bytes   bigint,
  sent_at      timestamptz not null default now()
);

create index if not exists quote_documents_lead_id_idx on public.quote_documents (lead_id);

alter table public.quote_documents enable row level security;
revoke all on public.quote_documents from anon, authenticated;

comment on table public.quote_documents is
  'Contract pages from /estimate that the office has been emailed. Written only by the website with the service role. Deleted with the pages by the daily purge.';

create unique index if not exists order_documents_storage_path_key on public.order_documents (storage_path);
