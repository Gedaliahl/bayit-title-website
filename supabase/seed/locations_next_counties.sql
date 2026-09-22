-- The six counties after the priority six, by transaction volume: Pinellas,
-- Lee, Collier, Sarasota, Polk and Brevard. Each gets a county page the moment
-- its row exists, because generateStaticParams for /counties/[slug] is built
-- from this table.
--
-- Not priority counties: they get no card on the home page, and the counties
-- index lists them under "More county pages" rather than "Where most of our
-- files are", which stays a statement about where the files actually are.
--
-- What is here and what is not, and why:
--
-- - clerk_name and clerk_url: the recording office, read from its own site.
--   Collier, Sarasota, Polk and Brevard were read live on 2026-09-20. Pinellas
--   and Lee refuse automated requests, so their names and URLs are the ones
--   docs/county-recording-turnaround.md recorded from the Internet Archive's
--   2025 capture on 2026-09-14.
-- - property_appraiser_url: the office's own site, confirmed live on
--   2026-09-20, for five of the six. Brevard's (bcpao.us) sits behind a bot
--   wall and could not be read, so it is left null: the estimate page then
--   offers no link for Brevard rather than one nobody has checked.
-- - recording_turnaround: the office's own words, verbatim, where it publishes
--   any — Pinellas, Lee and Collier. Sarasota publishes a timing statement
--   about Notices of Commencement only, which the turnaround document says not
--   to generalise, so it is null. Polk and Brevard publish nothing.
-- - customary_owner_policy_payer: null for all six. Local custom is filled in
--   only when the team states it — see docs/verify-worklist.md.
-- - e_recording_available: null for all six. The county page reads this as
--   "we e-record in this county", which is a statement about this office's
--   practice, not the clerk's menu, and only the team can make it.
--
-- Safe to re-run.

-- e_recording_available is named explicitly and set null. The column used to
-- default to true, which is a claim about this office's practice that nobody
-- had made; see supabase/migrations/20260920_locations_e_recording_default_null.sql.
insert into public.locations (slug, kind, name, is_priority, clerk_name, clerk_url, e_recording_available)
values
  (
    'pinellas-county',
    'county',
    'Pinellas County',
    false,
    'Pinellas County Clerk of the Circuit Court and Comptroller',
    'https://www.mypinellasclerk.gov/Home/Recording-Services',
    null
  ),
  (
    'lee-county',
    'county',
    'Lee County',
    false,
    'Lee County Clerk of Court',
    'https://www.leeclerk.org/services/e-record-official-records',
    null
  ),
  (
    'collier-county',
    'county',
    'Collier County',
    false,
    'Collier County Clerk of the Circuit Court',
    'https://www.collierclerk.com/recording-information/e-recording/',
    null
  ),
  (
    'sarasota-county',
    'county',
    'Sarasota County',
    false,
    'Sarasota County Clerk of the Circuit Court and County Comptroller',
    'https://www.sarasotaclerk.com/Records/Recording-Services',
    null
  ),
  (
    'polk-county',
    'county',
    'Polk County',
    false,
    'Polk County Clerk of the Circuit Court',
    'https://www.polkclerkfl.gov/101/Records',
    null
  ),
  (
    'brevard-county',
    'county',
    'Brevard County',
    false,
    'Brevard County Clerk of the Circuit Court',
    'https://www.brevardclerk.us/official-records',
    null
  )
on conflict (slug) do update set
  kind        = excluded.kind,
  name        = excluded.name,
  clerk_name  = excluded.clerk_name,
  clerk_url   = excluded.clerk_url,
  updated_at  = now();

-- Where the reader goes to read the assessed value off the public record.
update public.locations set
  property_appraiser_url = 'https://www.pcpao.gov/',
  updated_at = now()
where slug = 'pinellas-county';

update public.locations set
  property_appraiser_url = 'https://www.leepa.org/Search/PropertySearch.aspx',
  updated_at = now()
where slug = 'lee-county';

update public.locations set
  property_appraiser_url = 'https://www.collierappraiser.com/',
  updated_at = now()
where slug = 'collier-county';

update public.locations set
  property_appraiser_url = 'https://www.sarasotapropertyappraiser.gov/search/real-property-search/',
  updated_at = now()
where slug = 'sarasota-county';

update public.locations set
  property_appraiser_url = 'https://www.polkflpa.gov/',
  updated_at = now()
where slug = 'polk-county';

-- Turnaround, in the office's own words. Pinellas and Lee are near-identical
-- sentences; each is quoted from its own office's page, not copied across.
update public.locations set
  recording_turnaround = 'While in most cases the Clerk processes all documents received for recording within 2 business days, the Clerk cannot guarantee same or next-day recording for documents received by mail, drop-box, or though eRecording.',
  recording_turnaround_source_url = 'https://www.mypinellasclerk.gov/Home/Recording-Services',
  recording_turnaround_checked_on = '2026-09-14',
  notes = coalesce(notes || ' ', '') ||
    'The clerk''s site refuses automated requests; the turnaround statement was read from the Internet Archive''s 2025 capture of the page, and "though" is the office''s own spelling.',
  updated_at = now()
where slug = 'pinellas-county'
  and coalesce(notes, '') not like '%Internet Archive%';

update public.locations set
  recording_turnaround = 'While in most cases, the Clerk processes all documents received for recording within 2 business days; the Clerk cannot guarantee same or next-day recording for documents received by mail, drop-box, or through eRecording.',
  recording_turnaround_source_url = 'https://www.leeclerk.org/services/e-record-official-records',
  recording_turnaround_checked_on = '2026-09-14',
  notes = coalesce(notes || ' ', '') ||
    'The clerk''s site refuses automated requests; the turnaround statement was read from the Internet Archive''s 2025 capture of the page.',
  updated_at = now()
where slug = 'lee-county'
  and coalesce(notes, '') not like '%Internet Archive%';

update public.locations set
  recording_turnaround = 'Documents submitted by mail or electronically, including those submitted by third party vendors, are processed as time permits. The Clerk''s office cannot guarantee same day recording of documents submitted by these methods. Time sensitive documents should be presented in person at our main office, where they will be recorded while you wait.',
  recording_turnaround_source_url = 'https://www.collierclerk.com/recording-information/e-recording/',
  recording_turnaround_checked_on = '2026-09-20',
  updated_at = now()
where slug = 'collier-county';

-- Sarasota's only timing statement is about Notices of Commencement. It is not
-- a deed or mortgage turnaround and is not published as one.
update public.locations set
  notes = coalesce(notes || ' ', '') ||
    'The clerk''s Recording Services page gives a 1-2 business day figure for Notices of Commencement only. It says nothing about deeds or mortgages, so no turnaround is published for this county.',
  updated_at = now()
where slug = 'sarasota-county'
  and coalesce(notes, '') not like '%Notices of Commencement%';
