-- Applied to the website project on 2026-09-20 (migration
-- locations_e_recording_default_null).
--
-- The county page reads e_recording_available as "we e-record in this county,
-- so a document usually posts without a courier trip" — a statement about this
-- office's practice, not about the clerk's menu. The column defaulted to true,
-- so every county seeded without naming the field inherited the claim, and 61
-- county pages made it for a day. Unknown is null; the page then says nothing.
alter table public.locations alter column e_recording_available set default null;

-- Undo the inherited claim on every county the team has not confirmed. The six
-- priority counties were set true deliberately in the seeds and are left alone.
update public.locations set e_recording_available = null, updated_at = now()
where kind = 'county' and is_priority = false;
