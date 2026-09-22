-- One row per submission, however many times the browser sends it.
--
-- The forms generate a submission_id (crypto.randomUUID) once per submission
-- and send it again with any retry. lib/submissions.ts recordOnce() looks for
-- an existing row with that id before inserting, and the unique index is what
-- settles two copies arriving at once. Nullable, because a caller that sends
-- no id — an older page still open in a tab — must still be able to submit.
--
-- The code works with or without this applied: until the column exists it
-- inserts without it, and submissions simply are not de-duplicated.

alter table public.leads  add column if not exists submission_id uuid;
alter table public.orders add column if not exists submission_id uuid;

create unique index if not exists leads_submission_id_key  on public.leads  (submission_id);
create unique index if not exists orders_submission_id_key on public.orders (submission_id);
