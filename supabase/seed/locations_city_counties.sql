-- The county rows the sixteen city pages depend on, where the row was missing
-- a fact the city page reads.
--
-- lib/florida-cities.ts lists the sixteen most populous cities in Florida, and
-- three of them sit in counties outside the twelve the earlier seeds cover:
-- Port St. Lucie (St. Lucie), Tallahassee (Leon) and Gainesville (Alachua).
-- St. Lucie and Leon already carry their clerk's name, recording URL and
-- turnaround note; Alachua carried nothing. Everything below was read from the
-- office's own site on 2026-09-20.
--
-- - clerk_name: the office's own name for itself. The clerk's site
--   (alachuaclerk.org) forwards to the county portal, where the office styles
--   itself "Clerk of the Court & Comptroller".
-- - clerk_url: the Recording Information page on the county portal.
-- - property_appraiser_url: the appraiser's own site, live on 2026-09-20. The
--   search itself is hosted by a third party (qpublic), so the link is to the
--   office's home rather than to a page it does not control.
-- - recording_turnaround: the office's own words, verbatim. It is a statement
--   that e-recording is not instantaneous and that same-day is not guaranteed,
--   the same kind Collier publishes — not a number. It was not on the page
--   when docs/county-recording-turnaround.md was compiled on 2026-09-14, or
--   was missed; either way the document is updated with it.
-- - property_appraiser_url for St. Lucie (paslc.gov) and Leon (leonpa.gov):
--   both sit behind a bot wall (HTTP 403) and could not be read, so both are
--   left null, as Brevard's was. The estimate page then offers no link there
--   rather than one nobody has checked.
--
-- Safe to re-run.

update public.locations set
  clerk_name = 'Alachua County Clerk of the Court & Comptroller',
  clerk_url  = 'https://www.alachuacounty.us/Depts/Clerk/Pages/Recording.aspx',
  property_appraiser_url = 'https://www.acpafl.org/',
  recording_turnaround = 'Please be aware, e-recorded documents are not recorded into the Official Record instantaneously. E-Recorded documents are continuously processed throughout the day, however, due to volume, an e-recorded document submitted late in the day may not be recorded into the Official Record until the following business day. If you have a time sensitive document, we recommend recording your document in person at the Clerk''s Recording Department during normal business hours.',
  recording_turnaround_source_url = 'https://www.alachuacounty.us/Depts/Clerk/Pages/Recording.aspx',
  recording_turnaround_checked_on = '2026-09-20',
  updated_at = now()
where slug = 'alachua-county';
