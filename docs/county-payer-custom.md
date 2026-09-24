# Who customarily pays for the owner's policy — the evidence, county by county

Built to fill `customary_owner_policy_payer` in the `locations` table, which the
county and city pages print under "Who pays for the owner's policy". **Read on
20 September 2026.** Every value written is written with its source and that
date beside it (`customary_owner_policy_payer_source_*`), and the page says
whose statement it is repeating.

## Who a page may name, decided 24 September 2026

A page names only a government office, a title underwriter or our own team as
the source of a custom. Another title agency, a law firm or a lender is never
named or linked on a page, even where its statement was read below as
evidence. So:

- The twelve counties that rested on title agency, law firm and lender pages —
  Sarasota and Collier (buyer), and Hillsborough, Orange, Duval, Pinellas,
  Manatee, Osceola, Brevard, St. Lucie, Pasco and Marion (seller) — were
  confirmed by the team against its own files on 24 September 2026. They carry
  no source name and that date.
- Lee and Charlotte are credited to The Fund's survey alone, which calls both
  traditional seller-pay counties.
- Monroe is credited to The Fund's survey, named and not linked: the survey
  sits behind a members' login, and the copy read here is a lender's
  reproduction of it.

The sources below are kept as the record of what was read on 20 September.
They are evidence, not credits.

## What this is and is not

Who pays for the owner's title policy in a Florida residential sale is **custom,
not law**. Nothing in the statutes or the OIR rule allocates it; the purchase
contract does, with the county's custom as the starting point. The sources are
therefore published statements by people in the business — an underwriter's
survey, title agencies, real estate law firms — not primary law. That is a
weaker kind of source than this repository uses anywhere else, and it is why
each page carries a line saying so.

## The rule this document follows

A value is written for a county only where **at least two independent
publishers state it for that county by name**. A statewide "most counties are
seller-pay" does not count as a statement about any particular county. Where
the sources disagree the value is left null and the disagreement is recorded in
`notes`. Where the custom cannot be stated in one word (Monroe) the value is
null and `customary_owner_policy_detail` carries the sentence.

## The sources

| Key | Source | What it gives |
|---|---|---|
| FUND | The Fund (Attorneys' Title Fund Services), "And the Survey Says: Who Pays for Title Insurance by County?", Connie Clark, Fund Senior Underwriting Counsel. Survey of ATIF Directors, Fund Members and Fund employees. The article itself now sits behind a members' login at thefund.com; its text is reproduced in the TAG Lending Group cheat sheet below. | Statewide counts (44 seller-pay, 22 buyer-pay, one divided); Monroe's three-way split; Lee and Charlotte as traditional seller-pay counties; the NABOR contract note. **The county map is not available to us.** |
| TAG | TAG Lending Group, "Title Insurance by County" (2021), one-page chart of all 67 counties, and its cheat sheet quoting the Fund article. https://lending.tagteamnation.com/hubfs/TITLE%20INSURANCE%20BY%20COUNTY.pdf | All 67 counties: buyer = Broward, Collier, Miami-Dade, Sarasota; seller = the other 63. |
| WESTON | Weston Title & Escrow, one page per county, "In X County Florida, the seller/buyer pays for Title Insurance." https://westontitle.com/who-pays-for-title-insurance-in-… | 18 counties read. |
| BW | Barnes Walker (law firm), "Who Pays for Title Insurance in Florida?" https://barneswalker.com/who-pays-for-title-insurance-in-florida/ | 12 counties named. |
| KGT | Kelley, Grant & Tanis (law firm). https://kelleygrantlaw.com/does-the-buyer-of-seller-pay-for-title-insurance-in-florida/ | 7 counties named. |
| MT | Marina Title. https://marinatitle.com/determining-who-pays-for-title-insurance-in-the-state-of-florida-can-the-parties-negotiate/ | 8 counties named. |
| FRBAR | Florida Realtors / Florida Bar Residential Contract for Sale and Purchase, paragraph 9(c)(iii) "MIAMI-DADE/BROWARD REGIONAL PROVISION": "Buyer shall designate Closing Agent and pay for premiums for owner's title policy…". | Contract-form evidence for Miami-Dade and Broward. |

Discarded: locationtitle.com's "2025 Customs by County" says Palm Beach is
buyer-pay and Collier seller-pay, against every other source including the
firm's own table; it names no method. Barnes Walker's separate "Buyer vs. Seller
Matrix" page came back from the fetch with Pinellas and Hillsborough as
buyer-pay and Sarasota as seller-pay, contradicting the same firm's article; the
extraction is not trusted and the page is not used.

## The discrepancy that limits this document

TAG's chart shows **four** buyer-pay counties. The Fund's text, which TAG
reproduces on the same cheat sheet and cites as its survey, counts
**twenty-two**. Both cannot be right, and the Fund's county map — the only
thing that would settle it — is behind a login. Weston's Martin County page
(buyer) is one county where the chart is likely wrong. So the chart is treated
as a single, unreliable source: it corroborates, it never carries a county on
its own. That is why 48 counties stay null.

## County by county

Already set by the team, and agreed by the sources: **Broward** (buyer: TAG,
BW, KGT, MT, FRBAR), **Miami-Dade** (buyer: TAG, BW, KGT, MT, FRBAR), **Palm
Beach** (seller: TAG, WESTON, BW, KGT, MT).

Written on this pass:

| County | Value | Sources |
|---|---|---|
| Sarasota | buyer | WESTON, BW, MT, KGT, TAG |
| Collier | buyer | WESTON, BW, MT, TAG |
| Hillsborough | seller | WESTON, BW, KGT, MT, TAG |
| Orange | seller | WESTON, BW, KGT, MT, TAG |
| Duval | seller | WESTON, BW, KGT, TAG |
| Pinellas | seller | WESTON, BW, TAG |
| Lee | seller | WESTON, BW, TAG, FUND ("traditional seller-pay") |
| Manatee | seller | WESTON, BW, TAG |
| Osceola | seller | WESTON, MT, TAG |
| Charlotte | seller | BW, TAG, FUND ("traditional seller-pay") |
| Brevard | seller | WESTON, TAG |
| St. Lucie | seller | WESTON, TAG |
| Pasco | seller | WESTON, TAG |
| Marion | seller | WESTON, TAG |

Left null, with a reason recorded:

| County | Why |
|---|---|
| Monroe | FUND: Islamorada and the Upper Keys buyer-pay; Marathon and the Middle Keys seller-pay; Key West and the Lower Keys mixed. WESTON and TAG both say seller, which the survey shows is true of one part of the county. The Fund's sentence is carried in `customary_owner_policy_detail`. |
| Martin | WESTON says buyer; TAG says seller. Disagreement recorded in `notes`. |
| The other 48 | TAG is the only county-specific source, and TAG disagrees with the survey it cites. |

## What would clear the rest

1. The team stating, county by county, what it sees on its own files. That is
   the best source there is and it needs no publisher.
2. The Fund's county map, if a Fund member on the team can read the article and
   report the 22 buyer-pay counties it names.
3. Weston Title's remaining county pages: the site has one per county but does
   not link them from an index. Sixty-one URL guesses were tried; eighteen
   resolved.

## Using this on a page

The page prints the value as "Custom in X County is that the seller pays…", then
a muted line (`components/PayerSource.tsx`). Where a source is named: "That is
the custom as published by {source}, read on {date}." Where the team confirmed
it: "That is the custom as we see it on our own files, confirmed on {date}."
Either way it ends "It is a report of what is usual, not a rule, and not a
promise about your contract." Where the value is null the page keeps its "not
confirmed" paragraph and the withheld banner.
