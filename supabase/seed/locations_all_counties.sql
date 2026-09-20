-- Every Florida county that did not yet have a row, so that every county has a
-- page. Fifty-five counties: the 67 less the priority six
-- (locations_priority_counties.sql) and the next six (locations_next_counties.sql).
--
-- What a row with nothing but a name buys is a page that states what the
-- statute and the rule set for that county — the promulgated premium, the deed
-- stamp rate, the mortgage taxes, the per-page recording charge — and withholds,
-- visibly, the three things only a source can clear: who customarily pays for
-- the owner's policy, the recording office's own page, and its turnaround.
-- Where the table names no recording office the page falls back to the clerk of
-- the circuit court and cites Fla. Stat. § 28.222(1) for it.
--
-- Sixteen of the fifty-five get more, all of it from
-- docs/county-recording-turnaround.md, which read every recording office's own
-- site on 2026-09-14: the office's name, the URL of its recording page, and —
-- for fourteen — its own words on turnaround, verbatim. Every one of those
-- source pages was re-fetched on 2026-09-20 and answered, except Flagler's,
-- which refused the request. Leon and Flagler carry a note instead of a
-- turnaround because what their pages say is not a turnaround; the document
-- explains each.
--
-- Nothing here is a property appraiser link, a payer custom or an e-recording
-- claim. Those stay null until confirmed — see docs/verify-worklist.md.
--
-- Safe to re-run.

insert into public.locations (slug, kind, name, is_priority)
values
  ('alachua-county', 'county', 'Alachua County', false),
  ('baker-county', 'county', 'Baker County', false),
  ('bay-county', 'county', 'Bay County', false),
  ('bradford-county', 'county', 'Bradford County', false),
  ('calhoun-county', 'county', 'Calhoun County', false),
  ('charlotte-county', 'county', 'Charlotte County', false),
  ('citrus-county', 'county', 'Citrus County', false),
  ('clay-county', 'county', 'Clay County', false),
  ('columbia-county', 'county', 'Columbia County', false),
  ('desoto-county', 'county', 'DeSoto County', false),
  ('dixie-county', 'county', 'Dixie County', false),
  ('escambia-county', 'county', 'Escambia County', false),
  ('flagler-county', 'county', 'Flagler County', false),
  ('franklin-county', 'county', 'Franklin County', false),
  ('gadsden-county', 'county', 'Gadsden County', false),
  ('gilchrist-county', 'county', 'Gilchrist County', false),
  ('glades-county', 'county', 'Glades County', false),
  ('gulf-county', 'county', 'Gulf County', false),
  ('hamilton-county', 'county', 'Hamilton County', false),
  ('hardee-county', 'county', 'Hardee County', false),
  ('hendry-county', 'county', 'Hendry County', false),
  ('hernando-county', 'county', 'Hernando County', false),
  ('highlands-county', 'county', 'Highlands County', false),
  ('holmes-county', 'county', 'Holmes County', false),
  ('indian-river-county', 'county', 'Indian River County', false),
  ('jackson-county', 'county', 'Jackson County', false),
  ('jefferson-county', 'county', 'Jefferson County', false),
  ('lafayette-county', 'county', 'Lafayette County', false),
  ('lake-county', 'county', 'Lake County', false),
  ('leon-county', 'county', 'Leon County', false),
  ('levy-county', 'county', 'Levy County', false),
  ('liberty-county', 'county', 'Liberty County', false),
  ('madison-county', 'county', 'Madison County', false),
  ('manatee-county', 'county', 'Manatee County', false),
  ('marion-county', 'county', 'Marion County', false),
  ('martin-county', 'county', 'Martin County', false),
  ('monroe-county', 'county', 'Monroe County', false),
  ('nassau-county', 'county', 'Nassau County', false),
  ('okaloosa-county', 'county', 'Okaloosa County', false),
  ('okeechobee-county', 'county', 'Okeechobee County', false),
  ('osceola-county', 'county', 'Osceola County', false),
  ('pasco-county', 'county', 'Pasco County', false),
  ('putnam-county', 'county', 'Putnam County', false),
  ('st-johns-county', 'county', 'St. Johns County', false),
  ('st-lucie-county', 'county', 'St. Lucie County', false),
  ('santa-rosa-county', 'county', 'Santa Rosa County', false),
  ('seminole-county', 'county', 'Seminole County', false),
  ('sumter-county', 'county', 'Sumter County', false),
  ('suwannee-county', 'county', 'Suwannee County', false),
  ('taylor-county', 'county', 'Taylor County', false),
  ('union-county', 'county', 'Union County', false),
  ('volusia-county', 'county', 'Volusia County', false),
  ('wakulla-county', 'county', 'Wakulla County', false),
  ('walton-county', 'county', 'Walton County', false),
  ('washington-county', 'county', 'Washington County', false)
on conflict (slug) do update set
  kind       = excluded.kind,
  name       = excluded.name,
  updated_at = now();

update public.locations set
  clerk_name = 'Charlotte County Clerk of the Circuit Court',
  clerk_url  = 'https://charlotteclerk.com/departments/recording/',
  updated_at = now()
where slug = 'charlotte-county';

update public.locations set
  recording_turnaround = 'Documents are typically recorded the same day if submitted during regular business hours. Once the document is recorded you can immediately retrieve an image that includes our stamp.',
  recording_turnaround_source_url = 'https://charlotteclerk.com/departments/recording/',
  recording_turnaround_checked_on = '2026-09-14',
  updated_at = now()
where slug = 'charlotte-county';

update public.locations set
  clerk_name = 'Citrus County Clerk of the Circuit Court and Comptroller',
  clerk_url  = 'https://citrusclerk.org/206/Recording',
  updated_at = now()
where slug = 'citrus-county';

update public.locations set
  recording_turnaround = 'Documents are typically recorded the same day if submitted during regular business hours. Once the document is recorded you can immediately retrieve an image that includes our recording stamp.',
  recording_turnaround_source_url = 'https://citrusclerk.org/206/Recording',
  recording_turnaround_checked_on = '2026-09-14',
  updated_at = now()
where slug = 'citrus-county';

update public.locations set
  clerk_name = 'Flagler County Clerk of the Circuit Court & Comptroller',
  clerk_url  = 'https://flaglerclerk.gov/records/official-records/erecording/',
  updated_at = now()
where slug = 'flagler-county';

update public.locations set
  notes = coalesce(notes || ' ', '') || 'The clerk''s eRecording page says documents are "recorded and returned back to the submitter within hours instead of days". That describes eRecording''s advantage over mail rather than how long the office takes, so it is not published as a turnaround. The page refused an automated re-check on 2026-09-20.',
  updated_at = now()
where slug = 'flagler-county'
  and coalesce(notes, '') not like '%The clerk''s eRecording page says documen%';

update public.locations set
  clerk_name = 'Highlands County Clerk of the Circuit Court',
  clerk_url  = 'https://highlandsclerkfl.gov/clerk_to_the_board/official_records/electronic_recording.php',
  updated_at = now()
where slug = 'highlands-county';

update public.locations set
  recording_turnaround = 'Documents are typically recorded the same day if submitted during regular business hours. Once the document is recorded you can immediately retrieve an image that includes our stamp.',
  recording_turnaround_source_url = 'https://highlandsclerkfl.gov/clerk_to_the_board/official_records/electronic_recording.php',
  recording_turnaround_checked_on = '2026-09-14',
  updated_at = now()
where slug = 'highlands-county';

update public.locations set
  clerk_name = 'Lake County Clerk of the Circuit Court and Comptroller',
  clerk_url  = 'https://www.lakecountyclerkfl.gov/departments/records-administrative-services/official-records/recording/',
  updated_at = now()
where slug = 'lake-county';

update public.locations set
  recording_turnaround = 'Documents are recorded in the order received, typically within two (2) business days. The Clerk cannot guarantee same-day or next-day recording for documents submitted via mail, drop box, or eRecording.',
  recording_turnaround_source_url = 'https://www.lakecountyclerkfl.gov/departments/records-administrative-services/official-records/recording/',
  recording_turnaround_checked_on = '2026-09-14',
  updated_at = now()
where slug = 'lake-county';

update public.locations set
  clerk_name = 'Leon County Clerk of the Circuit Court & Comptroller',
  clerk_url  = 'https://leonclerk.com/online-services/e-recording/',
  updated_at = now()
where slug = 'leon-county';

update public.locations set
  notes = coalesce(notes || ' ', '') || 'The clerk''s e-recording page says a recorded document is returned to the submitter "seconds after the document is recorded". That describes what happens after recording, not how long the office takes to get to it, so no turnaround is published.',
  updated_at = now()
where slug = 'leon-county'
  and coalesce(notes, '') not like '%The clerk''s e-recording page says a reco%';

update public.locations set
  clerk_name = 'Manatee County Clerk of the Circuit Court',
  clerk_url  = 'https://www.manateeclerk.com/departments/recording/frequently-asked-questions/',
  updated_at = now()
where slug = 'manatee-county';

update public.locations set
  recording_turnaround = 'Your documents will be recorded the day they are received. Please allow 3-5 business days from the day they are recorded for the return of your documents.',
  recording_turnaround_source_url = 'https://www.manateeclerk.com/departments/recording/frequently-asked-questions/',
  recording_turnaround_checked_on = '2026-09-14',
  updated_at = now()
where slug = 'manatee-county';

update public.locations set
  notes = coalesce(notes || ' ', '') || 'The turnaround quoted is the clerk''s answer for documents sent by mail; the same FAQ says in-person originals are returned the same day and an e-recorded image is sent back as soon as the document is recorded.',
  updated_at = now()
where slug = 'manatee-county'
  and coalesce(notes, '') not like '%The turnaround quoted is the clerk''s ans%';

update public.locations set
  clerk_name = 'Okaloosa County Clerk of Court and Comptroller',
  clerk_url  = 'https://okaloosaclerk.com/official-records/erecording/',
  updated_at = now()
where slug = 'okaloosa-county';

update public.locations set
  recording_turnaround = 'There is no guarantee that documents will be recorded by Clerk of Court in the same day as it is e-Recorded.',
  recording_turnaround_source_url = 'https://okaloosaclerk.com/official-records/erecording/',
  recording_turnaround_checked_on = '2026-09-14',
  updated_at = now()
where slug = 'okaloosa-county';

update public.locations set
  clerk_name = 'Okeechobee County Clerk of Circuit Court and Comptroller',
  clerk_url  = 'https://myokeeclerk.com/index.asp?SEC=%7BD7E0AF3A-C4B0-40BA-A345-CD34FF2A48E4%7D',
  updated_at = now()
where slug = 'okeechobee-county';

update public.locations set
  recording_turnaround = 'All documents are recorded upon receipt. They must then be indexed, verified, and scanned to appear on public records before they are mailed back to the customer. The turn-around time is normally seven to ten days.',
  recording_turnaround_source_url = 'https://myokeeclerk.com/index.asp?SEC=%7BD7E0AF3A-C4B0-40BA-A345-CD34FF2A48E4%7D',
  recording_turnaround_checked_on = '2026-09-14',
  updated_at = now()
where slug = 'okeechobee-county';

update public.locations set
  notes = coalesce(notes || ' ', '') || 'Read carefully: the office says recording happens on receipt; the seven to ten days is the return of the paper, not the recording.',
  updated_at = now()
where slug = 'okeechobee-county'
  and coalesce(notes, '') not like '%Read carefully: the office says recordin%';

update public.locations set
  clerk_name = 'Osceola County Clerk of the Circuit Court & County Comptroller',
  clerk_url  = 'https://osceolaclerk.com/recording-info/recording-faqs/',
  updated_at = now()
where slug = 'osceola-county';

update public.locations set
  recording_turnaround = 'Our division stops recording at 4:30 p.m. each day. Documents received after 4:30 p.m. will be recorded the next business day.',
  recording_turnaround_source_url = 'https://osceolaclerk.com/recording-info/recording-faqs/',
  recording_turnaround_checked_on = '2026-09-14',
  updated_at = now()
where slug = 'osceola-county';

update public.locations set
  clerk_name = 'Putnam County Clerk of the Circuit Court & Comptroller',
  clerk_url  = 'https://putnamclerk.com/county-recorder/e-recording/',
  updated_at = now()
where slug = 'putnam-county';

update public.locations set
  recording_turnaround = 'When you submit a document for eRecording, that does not constitute as the document being recorded in Putnam County Clerk of Court''s Official Records. Documents are recorded in the order they are received. There is no guarantee that documents will be recorded by Clerk of Court in the same day as it is eRecorded.',
  recording_turnaround_source_url = 'https://putnamclerk.com/county-recorder/e-recording/',
  recording_turnaround_checked_on = '2026-09-14',
  updated_at = now()
where slug = 'putnam-county';

update public.locations set
  clerk_name = 'St. Lucie County Clerk of the Circuit Court',
  clerk_url  = 'https://stlucieclerk.gov/departments-top-menu/recording-department',
  updated_at = now()
where slug = 'st-lucie-county';

update public.locations set
  recording_turnaround = 'All documents are recorded upon receipt. They must then be indexed, verified and scanned to appear on public records before they are mailed back to the customer. The turn-around time is normally seven to ten days.',
  recording_turnaround_source_url = 'https://stlucieclerk.gov/departments-top-menu/recording-department',
  recording_turnaround_checked_on = '2026-09-14',
  updated_at = now()
where slug = 'st-lucie-county';

update public.locations set
  notes = coalesce(notes || ' ', '') || 'Read carefully: the office says recording happens on receipt; the seven to ten days is the return of the paper, not the recording.',
  updated_at = now()
where slug = 'st-lucie-county'
  and coalesce(notes, '') not like '%Read carefully: the office says recordin%';

update public.locations set
  clerk_name = 'Seminole County Clerk of the Circuit Court & Comptroller',
  clerk_url  = 'https://www.seminoleclerk.org/home/official-records/',
  updated_at = now()
where slug = 'seminole-county';

update public.locations set
  recording_turnaround = 'eRecording documents can be tracked, and are typically recorded within 24 to 72 hours.',
  recording_turnaround_source_url = 'https://www.seminoleclerk.org/home/official-records/',
  recording_turnaround_checked_on = '2026-09-14',
  updated_at = now()
where slug = 'seminole-county';

update public.locations set
  clerk_name = 'Taylor County Clerk of the Circuit Court',
  clerk_url  = 'https://taylorclerk.com/online-services/e-recording/',
  updated_at = now()
where slug = 'taylor-county';

update public.locations set
  recording_turnaround = 'There is no guarantee that documents will be recorded by Clerk of Court in the same day as it is e-Recorded.',
  recording_turnaround_source_url = 'https://taylorclerk.com/online-services/e-recording/',
  recording_turnaround_checked_on = '2026-09-14',
  updated_at = now()
where slug = 'taylor-county';

update public.locations set
  clerk_name = 'Volusia County Clerk of the Circuit Court',
  clerk_url  = 'https://www.clerk.org/official-records.aspx',
  updated_at = now()
where slug = 'volusia-county';

update public.locations set
  recording_turnaround = 'We cannot guarantee documents will be recorded on the same day that we receive them.',
  recording_turnaround_source_url = 'https://www.clerk.org/official-records.aspx',
  recording_turnaround_checked_on = '2026-09-14',
  updated_at = now()
where slug = 'volusia-county';

update public.locations set
  notes = coalesce(notes || ' ', '') || 'The same page offers in-person same-day recording at the DeLand courthouse and labels the Daytona drop box for documents that are not time-sensitive.',
  updated_at = now()
where slug = 'volusia-county'
  and coalesce(notes, '') not like '%The same page offers in-person same-day %';

update public.locations set
  clerk_name = 'Walton County Clerk of Court and Comptroller',
  clerk_url  = 'https://waltonclerk.com/erecording/',
  updated_at = now()
where slug = 'walton-county';

update public.locations set
  recording_turnaround = 'We cannot guarantee documents will be recorded on the same day that we receive them. If you have a time-sensitive document, we recommend recording your document in person at one of our office locations. Our E-recording service times are from 8:00 AM - 4:30 PM CST.',
  recording_turnaround_source_url = 'https://waltonclerk.com/erecording/',
  recording_turnaround_checked_on = '2026-09-14',
  updated_at = now()
where slug = 'walton-county';

update public.locations set
  notes = coalesce(notes || ' ', '') || 'Walton is one of the panhandle counties on Central time, which matters on a deadline.',
  updated_at = now()
where slug = 'walton-county'
  and coalesce(notes, '') not like '%Walton is one of the panhandle counties %';
