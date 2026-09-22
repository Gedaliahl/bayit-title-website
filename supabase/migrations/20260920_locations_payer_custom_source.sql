-- Applied to the website project on 2026-09-20 (migration
-- locations_payer_custom_source). Where a county's payer custom came from, and
-- when it was read. The custom is not law and not this office's own
-- observation, so the page has to be able to say whose statement it is
-- repeating and how old that statement is.
alter table public.locations
  add column if not exists customary_owner_policy_payer_source_name text,
  add column if not exists customary_owner_policy_payer_source_url text,
  add column if not exists customary_owner_policy_payer_checked_on date,
  add column if not exists customary_owner_policy_detail text;

comment on column public.locations.customary_owner_policy_payer_source_name is
  'Who published the custom the page repeats: an underwriter survey, a title agency, a law firm. Null where the team stated it from its own files.';
comment on column public.locations.customary_owner_policy_payer_source_url is
  'The page the custom was read from.';
comment on column public.locations.customary_owner_policy_payer_checked_on is
  'The date the source was read.';
comment on column public.locations.customary_owner_policy_detail is
  'A sentence where one word will not do — Monroe, where custom varies by where in the Keys the property is.';
