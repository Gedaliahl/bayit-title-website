-- Who customarily pays for the owner's title policy, county by county, from
-- published sources, with the source and the date it was read stored beside
-- the value so the page can say whose statement it is repeating.
--
-- The rule this file follows: a custom is written only where at least two
-- independent publishers state it for that county by name. The evidence for
-- every county, including the ones left null, is in
-- docs/county-payer-custom.md. In short:
--
-- - Broward, Miami-Dade and Palm Beach were already set by the team and are
--   not touched here; the sources agree with all three.
-- - Fourteen counties are set below on two or more agreeing sources.
-- - Martin is left null: Weston Title says buyer, the 2021 chart says seller.
-- - Monroe is left null with a `customary_owner_policy_detail` sentence: The
--   Fund's survey reports the custom varies by where in the Keys the property
--   is, which one word cannot say.
-- - The remaining 48 counties are left null. The only county-by-county source
--   for them is one lender's 2021 chart, which shows four buyer-pay counties
--   statewide, while The Fund's own survey text counts 22. The Fund's county
--   map is behind a members' login. One chart that disagrees with the survey
--   it cites is not enough to publish.
--
-- Read on 2026-09-20. Safe to re-run.

update public.locations set
  customary_owner_policy_payer = 'buyer',
  customary_owner_policy_payer_source_name = 'Weston Title & Escrow; Barnes Walker; Marina Title; Kelley, Grant & Tanis; a 2021 county chart by TAG Lending Group, attributed to a survey by The Fund',
  customary_owner_policy_payer_source_url = 'https://westontitle.com/who-pays-for-title-insurance-in-sarasota-county-fl/',
  customary_owner_policy_payer_checked_on = '2026-09-20',
  updated_at = now()
where slug = 'sarasota-county';

update public.locations set
  customary_owner_policy_payer = 'buyer',
  customary_owner_policy_payer_source_name = 'Weston Title & Escrow; Barnes Walker; Marina Title; a 2021 county chart by TAG Lending Group, attributed to a survey by The Fund',
  customary_owner_policy_payer_source_url = 'https://westontitle.com/who-pays-for-title-insurance-in-collier-county/',
  customary_owner_policy_payer_checked_on = '2026-09-20',
  updated_at = now()
where slug = 'collier-county';

update public.locations set
  customary_owner_policy_payer = 'seller',
  customary_owner_policy_payer_source_name = 'Weston Title & Escrow; Barnes Walker; Kelley, Grant & Tanis; Marina Title; a 2021 county chart by TAG Lending Group, attributed to a survey by The Fund',
  customary_owner_policy_payer_source_url = 'https://westontitle.com/who-pays-for-title-insurance-in-hillsborough-county-fl/',
  customary_owner_policy_payer_checked_on = '2026-09-20',
  updated_at = now()
where slug = 'hillsborough-county';

update public.locations set
  customary_owner_policy_payer = 'seller',
  customary_owner_policy_payer_source_name = 'Weston Title & Escrow; Barnes Walker; Kelley, Grant & Tanis; Marina Title; a 2021 county chart by TAG Lending Group, attributed to a survey by The Fund',
  customary_owner_policy_payer_source_url = 'https://westontitle.com/who-pays-for-title-insurance-in-orange-county-fl/',
  customary_owner_policy_payer_checked_on = '2026-09-20',
  updated_at = now()
where slug = 'orange-county';

update public.locations set
  customary_owner_policy_payer = 'seller',
  customary_owner_policy_payer_source_name = 'Weston Title & Escrow; Barnes Walker; Kelley, Grant & Tanis; a 2021 county chart by TAG Lending Group, attributed to a survey by The Fund',
  customary_owner_policy_payer_source_url = 'https://westontitle.com/who-pays-for-title-insurance-in-duval-county-florida/',
  customary_owner_policy_payer_checked_on = '2026-09-20',
  updated_at = now()
where slug = 'duval-county';

update public.locations set
  customary_owner_policy_payer = 'seller',
  customary_owner_policy_payer_source_name = 'Weston Title & Escrow; Barnes Walker; a 2021 county chart by TAG Lending Group, attributed to a survey by The Fund',
  customary_owner_policy_payer_source_url = 'https://westontitle.com/who-pays-for-title-insurance-in-pinellas-county-fl/',
  customary_owner_policy_payer_checked_on = '2026-09-20',
  updated_at = now()
where slug = 'pinellas-county';

update public.locations set
  customary_owner_policy_payer = 'seller',
  customary_owner_policy_payer_source_name = 'Weston Title & Escrow; Barnes Walker; a 2021 county chart by TAG Lending Group, attributed to a survey by The Fund',
  customary_owner_policy_payer_source_url = 'https://westontitle.com/who-pays-for-title-insurance-in-lee-county-fl/',
  customary_owner_policy_payer_checked_on = '2026-09-20',
  updated_at = now()
where slug = 'lee-county';

update public.locations set
  notes = coalesce(notes || ' ', '') || 'The Fund’s survey calls Lee a traditional seller-pay county and notes that the Naples Area Board of Realtors contract, where it is used here, has the seller pay for a policy from an agent the buyer picks.',
  updated_at = now()
where slug = 'lee-county'
  and coalesce(notes, '') not like '%The Fund’s survey calls Lee a traditiona%';

update public.locations set
  customary_owner_policy_payer = 'seller',
  customary_owner_policy_payer_source_name = 'Weston Title & Escrow; Barnes Walker; a 2021 county chart by TAG Lending Group, attributed to a survey by The Fund',
  customary_owner_policy_payer_source_url = 'https://westontitle.com/who-pays-for-title-insurance-in-manatee-county-fl/',
  customary_owner_policy_payer_checked_on = '2026-09-20',
  updated_at = now()
where slug = 'manatee-county';

update public.locations set
  customary_owner_policy_payer = 'seller',
  customary_owner_policy_payer_source_name = 'Weston Title & Escrow; Marina Title; a 2021 county chart by TAG Lending Group, attributed to a survey by The Fund',
  customary_owner_policy_payer_source_url = 'https://westontitle.com/who-pays-for-title-insurance-in-osceola-county-fl/',
  customary_owner_policy_payer_checked_on = '2026-09-20',
  updated_at = now()
where slug = 'osceola-county';

update public.locations set
  customary_owner_policy_payer = 'seller',
  customary_owner_policy_payer_source_name = 'Barnes Walker; a 2021 county chart by TAG Lending Group, attributed to a survey by The Fund',
  customary_owner_policy_payer_source_url = 'https://barneswalker.com/who-pays-for-title-insurance-in-florida/',
  customary_owner_policy_payer_checked_on = '2026-09-20',
  updated_at = now()
where slug = 'charlotte-county';

update public.locations set
  notes = coalesce(notes || ' ', '') || 'The Fund’s survey calls Charlotte a traditional seller-pay county and notes that the Naples Area Board of Realtors contract, where it is used here, has the seller pay for a policy from an agent the buyer picks.',
  updated_at = now()
where slug = 'charlotte-county'
  and coalesce(notes, '') not like '%The Fund’s survey calls Charlotte a trad%';

update public.locations set
  customary_owner_policy_payer = 'seller',
  customary_owner_policy_payer_source_name = 'Weston Title & Escrow; a 2021 county chart by TAG Lending Group, attributed to a survey by The Fund',
  customary_owner_policy_payer_source_url = 'https://westontitle.com/who-pays-for-title-insurance-in-brevard-county-fl/',
  customary_owner_policy_payer_checked_on = '2026-09-20',
  updated_at = now()
where slug = 'brevard-county';

update public.locations set
  customary_owner_policy_payer = 'seller',
  customary_owner_policy_payer_source_name = 'Weston Title & Escrow; a 2021 county chart by TAG Lending Group, attributed to a survey by The Fund',
  customary_owner_policy_payer_source_url = 'https://westontitle.com/who-pays-for-title-insurance-in-st-lucie-county-fl/',
  customary_owner_policy_payer_checked_on = '2026-09-20',
  updated_at = now()
where slug = 'st-lucie-county';

update public.locations set
  customary_owner_policy_payer = 'seller',
  customary_owner_policy_payer_source_name = 'Weston Title & Escrow; a 2021 county chart by TAG Lending Group, attributed to a survey by The Fund',
  customary_owner_policy_payer_source_url = 'https://westontitle.com/who-pays-for-title-insurance-in-pasco-county-fl/',
  customary_owner_policy_payer_checked_on = '2026-09-20',
  updated_at = now()
where slug = 'pasco-county';

update public.locations set
  customary_owner_policy_payer = 'seller',
  customary_owner_policy_payer_source_name = 'Weston Title & Escrow; a 2021 county chart by TAG Lending Group, attributed to a survey by The Fund',
  customary_owner_policy_payer_source_url = 'https://westontitle.com/who-pays-for-title-insurance-in-marion-county-fl/',
  customary_owner_policy_payer_checked_on = '2026-09-20',
  updated_at = now()
where slug = 'marion-county';

update public.locations set
  customary_owner_policy_payer = null,
  customary_owner_policy_detail = 'In Monroe County who pays for the owner’s policy depends on where in the Keys the property is. The Fund’s survey of its members reports that Islamorada and the Upper Keys follow the buyer-pay custom of the counties to the north, Marathon and the Middle Keys are a seller-pay area, and Key West and the Lower Keys are a mix of the two.',
  customary_owner_policy_payer_source_name = 'The Fund (Attorneys’ Title Fund Services), “And the Survey Says: Who Pays for Title Insurance by County?”, by Connie Clark, Fund Senior Underwriting Counsel',
  customary_owner_policy_payer_source_url = 'https://f.hubspotusercontent30.net/hubfs/2683382/Cheat%20Sheet%20-%20STANDARDS%20FOR%20WHO%20PAYS%20FOR%20TITLE%20INSURANCE%20BY%20COUNTY.pdf',
  customary_owner_policy_payer_checked_on = '2026-09-20',
  updated_at = now()
where slug = 'monroe-county';

update public.locations set
  notes = coalesce(notes || ' ', '') || 'Payer custom left unstated because the sources disagree: Weston Title & Escrow’s Martin County page says the buyer pays for title insurance; the 2021 TAG Lending Group chart says the seller. The Fund’s survey counts 22 buyer-pay counties statewide, so the chart may be the one that is wrong here. Ask the team what its files show.',
  updated_at = now()
where slug = 'martin-county'
  and coalesce(notes, '') not like '%sources disagree%';
