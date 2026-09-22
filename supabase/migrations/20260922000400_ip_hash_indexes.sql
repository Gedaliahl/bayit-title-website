-- The rate limit (lib/submissions.ts isRateLimited) counts rows by ip_hash in
-- the last hour on every submission. Without an index that is a scan of the
-- whole table, and it gets slower with every lead the site ever takes.

create index if not exists leads_ip_hash_created_at_idx  on public.leads  (ip_hash, created_at desc);
create index if not exists orders_ip_hash_created_at_idx on public.orders (ip_hash, created_at desc);
