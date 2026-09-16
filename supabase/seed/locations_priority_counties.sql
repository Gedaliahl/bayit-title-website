-- The six counties lib/site.ts calls priority counties, and the property
-- appraiser each one publishes.
--
-- Two reasons this file exists rather than a hand edit in the dashboard:
--
-- 1. `site.priorityCounties` and this table have to agree. A county named in
--    lib/site.ts but missing here is a link on the home page to a 404, because
--    generateStaticParams for /counties/[slug] is built from this table.
-- 2. /estimate prices a policy off the assessed value on the property
--    appraiser's own record, so it has to be able to send the reader to that
--    office. A county with no `property_appraiser_url` can be offered no link,
--    and the page says so rather than guessing at one.
--
-- Recording offices and appraiser URLs read from each office's own site on
-- 2026-09-16. Recording turnaround quotes are the offices' own words, taken
-- from docs/county-recording-turnaround.md — nothing here is an industry
-- average and nothing is paraphrased.
--
-- Safe to re-run.

insert into public.locations (slug, kind, name, is_priority, clerk_name, clerk_url)
values
  (
    'hillsborough-county',
    'county',
    'Hillsborough County',
    true,
    'Hillsborough County Clerk of the Circuit Court',
    'https://hillsclerk.com/propertyrecords-and-recording'
  ),
  (
    'orange-county',
    'county',
    'Orange County',
    true,
    'Orange County Comptroller',
    'https://www.occompt.com/168/Erecording'
  ),
  (
    'duval-county',
    'county',
    'Duval County',
    true,
    'Duval County Clerk of the Circuit Court',
    'https://www.duvalclerk.com/departments/county-services/recording'
  )
on conflict (slug) do update set
  kind       = excluded.kind,
  name       = excluded.name,
  is_priority = excluded.is_priority,
  clerk_name = excluded.clerk_name,
  clerk_url  = excluded.clerk_url,
  updated_at = now();

-- Where the reader goes to read the assessed value off the public record.
update public.locations set
  property_appraiser_url = 'https://web.bcpa.net/BcpaClient/#/Record-Search',
  updated_at = now()
where slug = 'broward-county';

update public.locations set
  property_appraiser_url = 'https://www.miamidadepa.gov/pa/real-estate/property-search.page',
  updated_at = now()
where slug = 'miami-dade-county';

update public.locations set
  property_appraiser_url = 'https://www.pbcpao.gov/',
  updated_at = now()
where slug = 'palm-beach-county';

update public.locations set
  property_appraiser_url = 'https://gis.hcpafl.org/PropertySearch/',
  updated_at = now()
where slug = 'hillsborough-county';

update public.locations set
  property_appraiser_url = 'https://ocpaweb.ocpafl.org/parcelsearch',
  updated_at = now()
where slug = 'orange-county';

update public.locations set
  property_appraiser_url = 'https://paopropertysearch.coj.net/',
  updated_at = now()
where slug = 'duval-county';

-- Hillsborough publishes one sentence about turnaround and it is a warning, not
-- a promise, so it is quoted exactly.
update public.locations set
  recording_turnaround = 'Recording in person is the ONLY option to guarantee same-day service.',
  recording_turnaround_source_url = 'https://hillsclerk.com/propertyrecords-and-recording',
  recording_turnaround_checked_on = '2026-09-14',
  e_recording_available = true,
  updated_at = now()
where slug = 'hillsborough-county';

update public.locations set
  recording_turnaround = 'The filer is solely responsible for ensuring the timeliness of a recording for any legal purpose. While the Clerk processes all documents as soon as possible in the order they are received, the Clerk cannot guarantee same or next-day recording for documents received by mail or through eRecording.',
  recording_turnaround_source_url = 'https://www.duvalclerk.com/departments/county-services/recording',
  recording_turnaround_checked_on = '2026-09-14',
  e_recording_available = true,
  updated_at = now()
where slug = 'duval-county';

-- Orange is deliberately left with no turnaround. The Comptroller's own FAQ
-- gives two different answers for the same question on the same page — three
-- business days in one place, seven to ten in another — so there is nothing
-- here we are willing to publish as the office's position. See
-- docs/county-recording-turnaround.md.
update public.locations set
  e_recording_available = true,
  notes = coalesce(notes || ' ', '') ||
    'Recording here is with the Orange County Comptroller rather than the Clerk of Courts. The Comptroller''s Official Records FAQ states two different turnaround times for a mailed deed on the same page (three business days, and seven to ten business days), so no turnaround is published for this county until the office confirms which is current.',
  updated_at = now()
where slug = 'orange-county'
  and coalesce(notes, '') not like '%two different turnaround times%';
