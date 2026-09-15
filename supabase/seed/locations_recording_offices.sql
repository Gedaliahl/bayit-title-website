-- Which office actually records a deed, and where its published schedule lives.
--
-- Verified 2026-09-14 against each office's own site. This matters on a title
-- agency's page: "the Clerk of Court" is the right answer in most of Florida
-- and the wrong answer in Broward.
--
-- Safe to re-run.

update public.locations set
  clerk_name = 'Broward County Records, Taxes and Treasury Division',
  clerk_url  = 'https://www.broward.org/RecordsTaxesTreasury/Records/Pages/Default.aspx',
  updated_at = now()
where slug = 'broward-county';

update public.locations set
  clerk_url  = 'https://www.miamidadeclerk.gov/clerk/official-records.page',
  updated_at = now()
where slug = 'miami-dade-county';

update public.locations set
  clerk_url  = 'https://www.mypalmbeachclerk.com/departments/recording',
  updated_at = now()
where slug = 'palm-beach-county';

-- Broward's recording office is not the Clerk of Courts. The division describes
-- itself as "the statutory repository for the Official Records of the County"
-- and records documents into the County's Land Records. This is the arrangement
-- Fla. Stat. § 28.24(13)(d) contemplates where the duty of maintaining official
-- records sits outside the clerk's office.
update public.locations set
  notes = coalesce(notes || ' ', '') ||
    'Recording is not with the Clerk of Courts here. Broward County''s Records, Taxes and Treasury Division is, in its own words, "the statutory repository for the Official Records of the County" and records documents into the County''s Land Records. This is the office Fla. Stat. § 28.24(13)(d) contemplates where the duty of maintaining official records sits outside the clerk''s office.',
  updated_at = now()
where slug = 'broward-county'
  and notes not like '%statutory repository%';
