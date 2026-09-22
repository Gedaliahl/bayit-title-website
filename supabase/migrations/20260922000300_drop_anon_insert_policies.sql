-- Close the side door into leads and orders.
--
-- The two policies below let anyone holding the project's public anon key
-- insert straight into the tables through PostgREST, with `with check (true)`:
-- no validation, no honeypot, no bot check and no rate limit. The website
-- never uses them — every write goes through a Route Handler with the service
-- role, which bypasses RLS — so dropping them costs the site nothing.

drop policy if exists "anon can submit a lead" on public.leads;
drop policy if exists "anon can submit an order" on public.orders;

-- With the policies gone, RLS already refuses anon everything. The grants go
-- too, so a policy re-created by mistake still would not reopen the tables.
revoke insert, update, delete on public.leads  from anon, authenticated;
revoke insert, update, delete on public.orders from anon, authenticated;
revoke select, insert, update, delete on public.order_documents from anon, authenticated;

comment on table public.leads is 'Public form submissions, written only by the website with the service role. No anon access.';
comment on table public.orders is 'Title orders from the website, written only by the website with the service role. No anon access. Distinct from the production system order tables.';
