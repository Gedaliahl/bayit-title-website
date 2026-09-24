-- Who customarily pays for the owner's title policy, county by county, with
-- whose statement it is and the date stored beside the value so the page can
-- say so.
--
-- Only a government office, a title underwriter or our own team is ever named
-- as the source (decided 24 September 2026). Another title agency, a law firm
-- or a lender is never named or linked on a page, even where its page was read
-- as evidence. The evidence for every county, including the ones left null, is
-- in docs/county-payer-custom.md. In short:
--
-- - Broward, Miami-Dade and Palm Beach were already set by the team and are
--   not touched here.
-- - Twelve counties are the team's own, confirmed from its files on
--   2026-09-24: no source name, and the date it confirmed them.
-- - Lee and Charlotte are credited to The Fund's survey, which calls both
--   traditional seller-pay counties.
-- - Monroe is left null with a `customary_owner_policy_detail` sentence: The
--   Fund's survey reports the custom varies by where in the Keys the property
--   is, which one word cannot say.
-- - Martin is left null: the published sources disagree.
-- - The remaining 48 counties are left null until the team confirms them.
--
-- The Fund's survey sits behind a members' login, so it is named and not
-- linked. Safe to re-run.

update public.locations set
  customary_owner_policy_payer = 'buyer',
  customary_owner_policy_payer_source_name = null,
  customary_owner_policy_payer_source_url = null,
  customary_owner_policy_payer_checked_on = '2026-09-24',
  updated_at = now()
where slug = 'sarasota-county';

update public.locations set
  customary_owner_policy_payer = 'buyer',
  customary_owner_policy_payer_source_name = null,
  customary_owner_policy_payer_source_url = null,
  customary_owner_policy_payer_checked_on = '2026-09-24',
  updated_at = now()
where slug = 'collier-county';

update public.locations set
  customary_owner_policy_payer = 'seller',
  customary_owner_policy_payer_source_name = null,
  customary_owner_policy_payer_source_url = null,
  customary_owner_policy_payer_checked_on = '2026-09-24',
  updated_at = now()
where slug = 'hillsborough-county';

update public.locations set
  customary_owner_policy_payer = 'seller',
  customary_owner_policy_payer_source_name = null,
  customary_owner_policy_payer_source_url = null,
  customary_owner_policy_payer_checked_on = '2026-09-24',
  updated_at = now()
where slug = 'orange-county';

update public.locations set
  customary_owner_policy_payer = 'seller',
  customary_owner_policy_payer_source_name = null,
  customary_owner_policy_payer_source_url = null,
  customary_owner_policy_payer_checked_on = '2026-09-24',
  updated_at = now()
where slug = 'duval-county';

update public.locations set
  customary_owner_policy_payer = 'seller',
  customary_owner_policy_payer_source_name = null,
  customary_owner_policy_payer_source_url = null,
  customary_owner_policy_payer_checked_on = '2026-09-24',
  updated_at = now()
where slug = 'pinellas-county';

update public.locations set
  customary_owner_policy_payer = 'seller',
  customary_owner_policy_payer_source_name = 'The Fund (Attorneys’ Title Fund Services), “And the Survey Says: Who Pays for Title Insurance by County?”, by Connie Clark, Fund Senior Underwriting Counsel',
  customary_owner_policy_payer_source_url = null,
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
  customary_owner_policy_payer_source_name = null,
  customary_owner_policy_payer_source_url = null,
  customary_owner_policy_payer_checked_on = '2026-09-24',
  updated_at = now()
where slug = 'manatee-county';

update public.locations set
  customary_owner_policy_payer = 'seller',
  customary_owner_policy_payer_source_name = null,
  customary_owner_policy_payer_source_url = null,
  customary_owner_policy_payer_checked_on = '2026-09-24',
  updated_at = now()
where slug = 'osceola-county';

update public.locations set
  customary_owner_policy_payer = 'seller',
  customary_owner_policy_payer_source_name = 'The Fund (Attorneys’ Title Fund Services), “And the Survey Says: Who Pays for Title Insurance by County?”, by Connie Clark, Fund Senior Underwriting Counsel',
  customary_owner_policy_payer_source_url = null,
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
  customary_owner_policy_payer_source_name = null,
  customary_owner_policy_payer_source_url = null,
  customary_owner_policy_payer_checked_on = '2026-09-24',
  updated_at = now()
where slug = 'brevard-county';

update public.locations set
  customary_owner_policy_payer = 'seller',
  customary_owner_policy_payer_source_name = null,
  customary_owner_policy_payer_source_url = null,
  customary_owner_policy_payer_checked_on = '2026-09-24',
  updated_at = now()
where slug = 'st-lucie-county';

update public.locations set
  customary_owner_policy_payer = 'seller',
  customary_owner_policy_payer_source_name = null,
  customary_owner_policy_payer_source_url = null,
  customary_owner_policy_payer_checked_on = '2026-09-24',
  updated_at = now()
where slug = 'pasco-county';

update public.locations set
  customary_owner_policy_payer = 'seller',
  customary_owner_policy_payer_source_name = null,
  customary_owner_policy_payer_source_url = null,
  customary_owner_policy_payer_checked_on = '2026-09-24',
  updated_at = now()
where slug = 'marion-county';

update public.locations set
  customary_owner_policy_payer = null,
  customary_owner_policy_detail = 'In Monroe County who pays for the owner’s policy depends on where in the Keys the property is. The Fund’s survey of its members reports that Islamorada and the Upper Keys follow the buyer-pay custom of the counties to the north, Marathon and the Middle Keys are a seller-pay area, and Key West and the Lower Keys are a mix of the two.',
  customary_owner_policy_payer_source_name = 'The Fund (Attorneys’ Title Fund Services), “And the Survey Says: Who Pays for Title Insurance by County?”, by Connie Clark, Fund Senior Underwriting Counsel',
  customary_owner_policy_payer_source_url = null,
  customary_owner_policy_payer_checked_on = '2026-09-20',
  updated_at = now()
where slug = 'monroe-county';

update public.locations set
  notes = coalesce(notes || ' ', '') || 'Payer custom left unstated because the sources disagree: Weston Title & Escrow’s Martin County page says the buyer pays for title insurance; the 2021 TAG Lending Group chart says the seller. The Fund’s survey counts 22 buyer-pay counties statewide, so the chart may be the one that is wrong here. Ask the team what its files show.',
  updated_at = now()
where slug = 'martin-county'
  and coalesce(notes, '') not like '%sources disagree%';
