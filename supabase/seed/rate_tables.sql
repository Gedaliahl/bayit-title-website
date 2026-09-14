-- Recording service charges and the taxes collected at recording, for every
-- Florida county.
--
-- Read this before changing a number.
--
-- Every figure here is a Florida statutory amount, verified against the primary
-- source recorded in `source_url` on 2026-09-14. None of it is an estimate, an
-- average, or a figure taken from a summary site. If a number below cannot be
-- traced to the statute or the county's own published schedule, it does not
-- belong in this file.
--
-- Why most rows carry `county_slug = NULL`:
--   Fla. Stat. § 28.24 sets what a clerk MAY charge for recording and says the
--   charges "may not exceed those specified in this section." The recording
--   charge is therefore a statewide ceiling, not a county-by-county price, and
--   the counties publish the ceiling. So a NULL county_slug means "all 67
--   counties" and a row with a county_slug is a genuine local departure.
--
--   There is exactly one such departure in Florida: Miami-Dade. Its deed rate
--   is 60 cents rather than 70, and it is the only county that levies the
--   discretionary surtax, because Fla. Stat. § 125.011(1) limits the surtax to
--   a county operating under an 1885-constitution home rule charter.
--
-- `effective_from` records the date the figure was verified against its source,
-- not the date a rate changed. `effective_to` stays NULL while a figure is
-- current; supersede a figure by setting it rather than by editing in place.
--
-- Safe to re-run.

-- Keeps a re-run from stacking duplicate rows, while still allowing a
-- superseded figure to be kept alongside its replacement under a later date.
create unique index if not exists rate_tables_key_county_effective_idx
  on public.rate_tables (key, coalesce(county_slug, ''), effective_from);

delete from public.rate_tables
where key in (
  'recording_first_page',
  'recording_additional_page',
  'recording_extra_name',
  'recording_court_instrument_first_page',
  'recording_court_instrument_additional_page',
  'recording_plat_first_page',
  'recording_plat_additional_page',
  'recording_certified_copy',
  'recording_copy_page',
  'recording_copy_oversize_page',
  'recording_record_search',
  'tax_doc_stamps_deed',
  'tax_doc_stamps_surtax',
  'tax_doc_stamps_mortgage',
  'tax_doc_stamps_note_cap',
  'tax_intangible_mortgage'
);

insert into public.rate_tables
  (key, county_slug, label, numeric_value, unit, effective_from, source_url, source_note)
values
  -- ---------------------------------------------------------------- recording
  ('recording_first_page', null,
   'Recording a deed, mortgage or other instrument — first page',
   10.00, 'usd', date '2026-09-14',
   'https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0000-0099/0028/Sections/0028.24.html',
   'Fla. Stat. § 28.24(13). The $10.00 is three separate charges the statute stacks on one page: $5.00 under (13)(a), $1.00 to the Public Records Modernization Trust Fund under (13)(d)1., and $4.00 for court-related technology under (13)(e).'),

  ('recording_additional_page', null,
   'Each additional page',
   8.50, 'usd', date '2026-09-14',
   'https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0000-0099/0028/Sections/0028.24.html',
   'Fla. Stat. § 28.24(13): $4.00 under (13)(b), $0.50 under (13)(d)2., $4.00 under (13)(e).'),

  ('recording_extra_name', null,
   'Indexing each name past the first four',
   1.00, 'usd', date '2026-09-14',
   'https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0000-0099/0028/Sections/0028.24.html',
   'Fla. Stat. § 28.24(13)(c). Reaches a deed with several grantors and grantees, or a mortgage naming multiple borrowers.'),

  ('recording_court_instrument_first_page', null,
   'Recording a judgment received from the court, or a lis pendens — first page',
   5.00, 'usd', date '2026-09-14',
   'https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0000-0099/0028/Sections/0028.24.html',
   'Fla. Stat. § 28.24(13)(a). Cheaper than a deed because (13)(d) and (13)(e) expressly exclude judgments received from the courts and notices of lis pendens.'),

  ('recording_court_instrument_additional_page', null,
   'Judgment or lis pendens — each additional page',
   4.00, 'usd', date '2026-09-14',
   'https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0000-0099/0028/Sections/0028.24.html',
   'Fla. Stat. § 28.24(13)(b), with the same (13)(d) and (13)(e) exclusions.'),

  ('recording_plat_first_page', null,
   'Examining, certifying and recording a plat, or a condominium exhibit larger than 14" x 8½" — first page',
   30.00, 'usd', date '2026-09-14',
   'https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0000-0099/0028/Sections/0028.24.html',
   'Fla. Stat. § 28.24(12)(a).'),

  ('recording_plat_additional_page', null,
   'Plat or oversized condominium exhibit — each additional page',
   15.00, 'usd', date '2026-09-14',
   'https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0000-0099/0028/Sections/0028.24.html',
   'Fla. Stat. § 28.24(12)(b).'),

  ('recording_certified_copy', null,
   'Certifying a copy of a recorded instrument',
   2.00, 'usd', date '2026-09-14',
   'https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0000-0099/0028/Sections/0028.24.html',
   'Fla. Stat. § 28.24(4). Charged per instrument for a court record under (4)(a) and per page for a record that is not a court record under (4)(b), and is on top of the copy charge itself.'),

  ('recording_copy_page', null,
   'Plain copy of a recorded instrument, per page',
   1.00, 'usd', date '2026-09-14',
   'https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0000-0099/0028/Sections/0028.24.html',
   'Fla. Stat. § 28.24(6)(a), for pages no larger than 14" x 8½".'),

  ('recording_copy_oversize_page', null,
   'Copy of an instrument larger than 14" x 8½", per page',
   5.00, 'usd', date '2026-09-14',
   'https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0000-0099/0028/Sections/0028.24.html',
   'Fla. Stat. § 28.24(6)(b). This is the charge that applies to a surveyed plat sheet.'),

  ('recording_record_search', null,
   'Searching the official records, per name, per year searched',
   2.00, 'usd', date '2026-09-14',
   'https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0000-0099/0028/Sections/0028.24.html',
   'Fla. Stat. § 28.24(21). This is the clerk''s counter charge, not the cost of a title search.'),

  -- ------------------------------------------------------------------- taxes
  ('tax_doc_stamps_deed', null,
   'Documentary stamp tax on the deed',
   0.70, 'usd_per_100', date '2026-09-14',
   'https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0200-0299/0201/Sections/0201.02.html',
   'Fla. Stat. § 201.02(1)(a): 70 cents on each $100 of consideration, and on each fraction of $100 as though it were a full $100. Consideration includes any mortgage balance taken subject to or assumed, not only cash.'),

  ('tax_doc_stamps_mortgage', null,
   'Documentary stamp tax on the note and mortgage',
   0.35, 'usd_per_100', date '2026-09-14',
   'https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0200-0299/0201/Sections/0201.08.html',
   'Fla. Stat. § 201.08(1)(b): 35 cents on each $100 or fraction of the indebtedness. There is no cap on a recorded mortgage.'),

  ('tax_doc_stamps_note_cap', null,
   'Maximum documentary stamp tax on an unsecured note',
   2450.00, 'usd', date '2026-09-14',
   'https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0200-0299/0201/Sections/0201.08.html',
   'Fla. Stat. § 201.08(1)(a). The cap is on a note not secured by Florida real property. It does not reduce the tax on a recorded mortgage.'),

  ('tax_intangible_mortgage', null,
   'Nonrecurring intangible tax on the mortgage',
   0.002, 'usd_per_dollar', date '2026-09-14',
   'https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0100-0199/0199/Sections/0199.133.html',
   'Fla. Stat. § 199.133(1): 2 mills on each dollar of an obligation secured by a lien on Florida real property. $2.00 per $1,000 financed.'),

  -- ----------------------------------------------------- Miami-Dade departures
  ('tax_doc_stamps_deed', 'miami-dade-county',
   'Documentary stamp tax on the deed',
   0.60, 'usd_per_100', date '2026-09-14',
   'https://floridarevenue.com/taxes/taxesfees/pages/doc_stamp.aspx',
   'Miami-Dade is the one Florida county whose deed rate is not 70 cents. The Florida Department of Revenue states 60 cents on each $100 or portion thereof of the total consideration, and the Miami-Dade Clerk publishes the same rate: https://www.miamidadeclerk.gov/clerk/official-records.page'),

  ('tax_doc_stamps_surtax', 'miami-dade-county',
   'Miami-Dade discretionary surtax on the deed',
   0.45, 'usd_per_100', date '2026-09-14',
   'https://www.miamidadeclerk.gov/clerk/official-records.page',
   'Charged only on a transfer of an interest in real property other than a single-family residence. Authorised by Fla. Stat. §§ 201.031 and 125.0167, which cap the surtax at 45 cents per $100 and limit it to a county as defined in Fla. Stat. § 125.011(1) — an 1885-constitution home rule charter county, which in Florida means Miami-Dade alone. A condominium unit, a co-operative unit and a detached dwelling all count as a single-family residence for this purpose and are not surtaxed.');
