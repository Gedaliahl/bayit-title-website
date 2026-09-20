# What is stopping the site going live

Checked 20 September 2026 against the repository, the website Supabase project,
the Vercel team, GitHub, the live domain, and the primary sources named below.
This is the answer to one question — what stands between the repository as it
is and `www.bayittitle.com` serving it — and it separates the items a web
search can settle (settled below) from the ones that only a person can.

## Where things stand

- **The domain is still on Wix.** `bayittitle.com`'s nameservers are
  `ns12.wixdns.net` and `ns13.wixdns.net`; `www` is a CNAME to `cdn3.wixdns.net`;
  the apex A records are Wix's. The Wix site answers `200` on `www` and 301s the
  apex to it. Nothing about the new site is reachable on the real hostname.
- **The Vercel production deployment is up** at `bayit-title-website.vercel.app`
  and returns `Disallow: /` for everything, exactly as `lib/seo.ts` intends
  until the domain is attached. The Vercel team (`bayit`) holds one registered
  domain, `bayitconnect.com`, and no aliases; `bayittitle.com` is not attached to
  any project. The MCP token could list the project but not read it (404 on
  `get_project`, `list_project_domains` and `filter_project_envs`), so the
  production environment variables could not be checked from here.
- **Production publishes two library pages.** `hoa-approval-delay-closing-florida`
  and `non-standard-purchase-contract-florida-closing` are `status: reviewed`.
  The other six title-problem pages and the signings service page are
  `status: draft` and have no route in production. Together they carry 33
  `pending_confirmation` items and two `[VERIFY]` flags.
- **PR #14, "Give every Florida county a page", is open, CI green, mergeable.**
  Its seed is already applied: the `locations` table holds all 67 counties.
- **CI is green on `main`** — lint, typecheck, 212 tests, and both builds.

## The cutover itself — what has to happen, in order

1. **Copy the DNS zone before touching nameservers.** Wix hosts the zone, and
   the zone carries the firm's mail: `MX 10 bayittitle-com.mail.protection.outlook.com`
   and `v=spf1 include:spf.protection.outlook.com -all`. Moving the nameservers
   to Vercel without recreating the MX, SPF and any DKIM/autodiscover records
   for Microsoft 365 would stop the office's email. Export every record from
   the Wix DNS panel first; the alternative is to leave the nameservers on Wix
   and change only the `www` CNAME and the apex A record to Vercel's.
2. **Attach `www.bayittitle.com` to the Vercel project as the primary domain**,
   with the apex attached and redirecting to `www`. That single change is what
   turns indexing on: `robots.txt`, the `noindex` tag and the sitemap all key
   off `VERCEL_PROJECT_PRODUCTION_URL`. Nothing else has to be remembered on
   the day.
3. **Confirm the production environment variables** in the Vercel dashboard:
   `SUPABASE_URL` (website project only), `SUPABASE_SERVICE_ROLE_KEY`,
   `RESEND_API_KEY` and `NOTIFY_FROM_EMAIL` (without them forms persist but
   nobody is notified), `NEXT_PUBLIC_SITE_URL`, and optionally
   `GOOGLE_SITE_VERIFICATION`, `BING_SITE_VERIFICATION`, `ARCGIS_API_KEY`.
   This could not be verified from this session.
4. **Re-check the redirect map against Search Console's Pages report on the
   Wix property.** The Wix sitemap today lists nine URLs (`/`, `/about`,
   `/contact-us`, `/rates`, `/privacy`, `/privacy-policy`, `/order-title`,
   `/titleinsurance`, `/process`), all of which `next.config.mjs` covers
   (`/about` is the same path on both). Anything Google still indexes beyond
   those only shows up in Search Console.
5. **Merge PR #14** or decide not to. Either is fine for launch; the county pages
   render withheld banners rather than guesses.
6. **Submit the sitemap** in Search Console and Bing once the domain answers.

None of these is a content question. The site can go live today with the
pages that are reviewed, and the drafts stay invisible until they are signed.

## Settled from primary sources on 20 September 2026

Each of these was an open question in `docs/outstanding-questions.md` or a
`pending_confirmation` entry. What follows is what the source says. Where the
project rule is that a licensed person or counsel must confirm before the
content changes, that is noted; the research is recorded so the confirmation is
a reading rather than a search.

### HA-06 — the estoppel figures on the published HOA page were wrong. Fixed.

The HOA page quoted the estoppel certificate caps as printed in
§ 718.116(8) and § 720.30851: $250, plus $100 expedited, plus $150 delinquent,
with aggregates of $750 to $2,500. Both statutes direct the Department of
Business and Professional Regulation to adjust those figures every five years
for CPI, and it did, effective 1 July 2022. The Department's published notice
([ESTOPPEL_CERTIFICATE_FEES.pdf](https://www2.myfloridalicense.com/lsc/documents/ESTOPPEL_CERTIFICATE_FEES.pdf))
sets the caps in force at **$299**, **$119** expedited, **$179** delinquent, and
aggregates of **$896** (25 or fewer), **$1,194** (26–50), **$1,791** (51–100) and
**$2,985** (over 100), with the next update due by 1 July 2027. The page now
carries the adjusted figures and says why they differ from the statute's text.

The same notice says the **$150 per-applicant transfer fee** under
§ 718.112(2)(k) was due for its own adjustment "by July 1, 2026". The 2025
statute text still reads $150 and no adjusted figure could be found published;
**confirm the current transfer-fee cap on the Department's site before the
page is relied on for it.** HA-05 (the (2)(k) cite) is confirmed against the
2025 statute.

### OP-04 — how the FAR/BAR forms allocate open permits. Answered; resolves the contradiction on the open-permits page.

Read from the Florida Realtors/Florida Bar redlines published by Florida
Realtors (standard form `FloridaRealtors/FloridaBar-7`, Rev. 12/24; "AS IS"
form `FloridaRealtors/FloridaBar-ASIS-7x`, Rev. 2/26, © 2024–2026). The two forms answer
differently, and the page's `direct_answer` ("normally the seller's to
resolve") and body ("the buyer's under AS IS ¶12(c)") are each right about one
form:

- **Standard contract.** Paragraph 9(a)(iii) sets a **Permit Limit** — a dollar
  amount or a percentage of the purchase price, **1.5% if left blank** — and
  paragraph 12 ("Property Inspection and Repair") contains an "Inspection and
  Close-Out of Building Permits" sub-paragraph under which the **seller** must,
  up to the Permit Limit and no later than 5 days before closing, have open and
  expired permits closed and obtain and close permits for unpermitted work; if
  the cost exceeds the limit either side may elect (seller pays the excess, or
  buyer takes a credit of the Permit Limit) or terminate; if final inspections
  are delayed by the government, closing extends up to 10 days. Paragraph 10(b)
  is the seller's permits disclosure, citing § 553.79.
- **"AS IS" contract.** Paragraph 12(c): the seller must deliver plans and
  documentation and "cooperate in good faith with Buyer's efforts to obtain
  estimates", including signing authorizations, "but in fulfilling such
  obligation, Seller shall not be required to expend, or become obligated to
  expend, any money." Close-out is the **buyer's** cost.

The forms are copyrighted ("© 2024 Florida Realtors® and The Florida Bar. All
rights reserved."), so the page should paraphrase and quote only short phrases,
which is what it does. Both revisions' 2024 changes (paragraph 9 "Closing
Services", 15(a) broker deposit, 19 rider checkboxes) do not touch the permit
provisions. **Suggested fix to the page:** the direct answer should say which
form governs rather than picking a side.

### LT-10 — the § 48.23 subsections. Confirmed.

The 2025 statute at flsenate.gov: **(2)** is the one-year expiry for a notice
not founded on a recorded instrument or a part I, chapter 713 lien; **(3)** is
the court's power to "control and discharge the recorded notice of lis pendens
as the court would grant and dissolve injunctions." The bond is not in the
statute's words; it comes from the case law below.

### LT-09 — the fair nexus standard. Researched; counsel decides whether to cite.

The standard the page states is settled Florida Supreme Court law:
*Chiusolo v. Kennedy*, 614 So. 2d 491 (Fla. 1993) put the burden on the
proponent of the lis pendens to show a "fair nexus" between the apparent legal
or equitable ownership of the property and the dispute embodied in the lawsuit;
*Medical Facilities Development, Inc. v. Little Arch Creek Properties, Inc.*,
675 So. 2d 915 (Fla. 1996) held that a bond is within the court's discretion
under § 48.23(3), not mandatory. District courts still apply both. The page's
prose is consistent with them. Whether to restore the citations is counsel's
call under the project rule; the removed cite was accurate.

### FS-02 — the consular fee's temporary amendment. Not relevant to this page.

22 CFR 22.1 item 41 is still **$50** for the first notarial seal and $50 for
each additional seal in the same transaction. The temporary amendment at
91 FR 34772 (effective 1 July 2026 through 31 December 2026) adds a $750
expedited B1/B2 visa interview fee and does not touch items 41–44. No recheck
is needed before publishing. Apostille, legalisation and courier costs remain
the team's to supply or withhold.

### BK — the federal bankruptcy cites. Confirmed current.

Post-restyling (1 December 2024) text at Cornell LII: Rule 2002(a)(2) 21 days'
notice; Rule 6004(b) objections at least 7 days before; Rule 6004(h) sale
order "stayed for 14 days after the order is entered" unless the court orders
otherwise; Rule 8002(a)(1) notice of appeal within 14 days; 11 U.S.C. § 363(m)
as quoted on the page; § 363(f)'s five grounds. Whether a title agency's page
should say any of it is bankruptcy counsel's question, but nothing on the page
is misstated.

### FIRPTA — the settlement agent's exposure. Confirmed as written.

The buyer is the withholding agent under 26 U.S.C. § 1445; 15% of the amount
realized, 0% at or under $300,000 and 10% between $300,000 and $1,000,000 where
the buyer will use the property as a residence; Forms 8288, 8288-A and 8288-B
are as the page describes. Under Treas. Reg. § 1.1445-4 a settlement officer
performing only ministerial tasks (receiving funds, recording, transmitting
documents) is **not** an "agent" of either party; an agent who knows a
non-foreign certification is false must notify the buyer and the IRS, and that
liability is capped at the agent's compensation from the transaction. The
page's "our role is procedural" paragraph matches this. Counsel's eye is still
worth having on the sentence about remitting on the buyer's behalf.

### The entireties question — researched; still needs a Florida attorney to sign it.

This is the one remaining `[VERIFY]` on the judgment page, and by the project's
own rule it is case law and needs an attorney's statement. What the sources say:

- A conveyance to spouses as husband and wife is presumed to create an estate
  by the entireties absent express contrary language; the creditor bears the
  burden of rebutting it. *Beal Bank, SSB v. Almand & Associates*,
  780 So. 2d 45 (Fla. 2001), applying *In re Estate of Suggs*, 405 So. 2d 1360
  (Fla. 5th DCA 1981) and *First National Bank v. Hector Supply Co.*,
  254 So. 2d 777 (Fla. 1971) (the six unities: possession, interest, title,
  time, survivorship, marriage).
- "Only the creditors of both the husband and wife, jointly, may attach the
  tenancy by the entireties property." *Sitomer v. Orlan*, 660 So. 2d 1111
  (Fla. 4th DCA 1995), quoted in *Beal Bank*. A judgment against one spouse
  alone therefore does not attach to entireties real property.
- The protection ends when the estate does: on dissolution the tenants become
  tenants in common (Fla. Stat. § 689.15) and the lien attaches to the debtor's
  half; if the non-debtor spouse dies first the debtor owns alone and the lien
  attaches. A federal tax lien is the exception (*United States v. Craft*,
  535 U.S. 274 (2002)).
- At a closing the usual documentation is a continuous-marriage affidavit
  (title taken during the marriage, married continuously through the sale) and
  the underwriter's written acceptance, which is the practice the page already
  describes for name-match judgments.

**What counsel is being asked:** may the page state that a judgment against
one spouse does not attach to entireties property, qualified by the marriage
continuing, both spouses living, no joint liability and no federal tax lien,
and with the affidavit named as what we require. The research is not the
sign-off.

### SG-04 — online notary registrations. Checked what is public; needs the RON registry.

The Department of State's notary search confirms the two standard commissions
on the site exactly as `lib/team.ts` states them: **Jennifer Eileen Simon,
HH 795313, expires 05/24/30** and **Chaya Brooks, HH 817398, Coral Springs,
expires 06/24/30**. That search does not show online-notary registration under
§ 117.225. The separate Remote Online Notary registry at
`online-notary.sunbiz.org` refused an automated query (403), so **someone has
to run the two names through it by hand** and record the result. If neither is
registered, the signings page should name the RON platform and the commission
the notarial act is performed under, per SG-05, and the underwriter's
approved-platform list should be checked in the same sitting.

### OP-06 — the building-and-zoning exclusion. Confirmed in the form text.

The ALTA Owner's Policy (07-01-2021) filed with the Florida Office of Insurance
Regulation excludes "any law, ordinance, permit, or governmental regulation
(including those relating to building and zoning)" restricting occupancy, use,
character, dimensions, subdivision or environmental protection, and says
"Exclusion 1 does not modify or limit the coverage provided under Covered
Risk 5 or 6" — the enforcement-notice covered risks, which reach a violation
only "to the extent … described by the enforcing governmental authority in an
Enforcement Notice" recorded in the public records. That is the structure the
open-permits page relies on. What remains of OP-06 is only confirming that
First American issues this form, which the team can read off any recent policy.

### Brevard County property appraiser. Confirmed.

`https://www.bcpao.us/` is the Brevard County Property Appraiser's site
(property search at `/propertysearch/`). `property_appraiser_url` is still null
on the `brevard-county` row; set it.

### GLBA and the privacy policy. Researched for counsel.

Fla. Admin. Code ch. 69O-128 applies to "all licensees regulated pursuant to
the Florida Insurance Code" — which includes a title insurance agency — for
nonpublic personal financial information about individuals obtaining products
"primarily for personal, family or household purposes". Rule 69O-128.005
requires an initial privacy notice "not later than when the licensee
establishes a customer relationship"; the exception for not sharing with
nonaffiliated third parties applies to *consumers* who do not become
*customers*, so a closing customer gets a notice regardless. The website
privacy policy is scoped to the website and does not serve as that notice. The
answer to the README's first question for counsel is therefore very likely
**yes, a separate GLBA/69O-128 notice is needed on the closing side**; the
form and delivery are counsel's, and this remains outside the website.

## Still open, and who holds it

| Item | Holder | Blocks launch? |
|---|---|---|
| Attach the domain; move DNS without losing Microsoft 365 mail | Gedaliah / whoever holds the registrar and Wix logins | **Yes** — nothing is live until this |
| Production env vars confirmed in Vercel | same | **Yes** for forms; site renders without them |
| Search Console Pages report vs the redirect map | same | Before cutover |
| PR #14 merge decision | Gedaliah | No |
| 33 `pending_confirmation` items on the seven drafts (timelines, costs, practice, six verdict labels) | the team, an afternoon | No — drafts stay hidden; **yes** for the library to exist beyond two pages |
| Litigation page's underlying file (LT-05) | the team | No — page stays unpublished |
| Entireties statement (judgment page) | Florida real estate attorney | No — page stays draft |
| Fair-nexus citation (LT-09), FIRPTA sentence, bankruptcy page | counsel, non-blocking | No |
| Online notary registry lookup for Simon and Brooks (SG-04) | anyone, five minutes, by hand | No |
| Transfer-fee cap after the July 2026 DBPR adjustment (HA-05) | anyone, on the Department's site | No, but the published page states $150 |
| Privacy policy through a lawyer; GLBA notice on the closing side; retention schedule | counsel | Not for the website |
| Who pays for the owner's policy in 64 counties; property appraiser URL in 56; recorder page in 39 | the team, from files | No — pages say "not confirmed" |
| Bios for Shevy and Gedaliah | each of them | No — sections are omitted |
| Photography | the firm | No |
| Google Business Profile API access (reviews sync) | reapply from a bayittitle.com address | No |
| SMS consent mechanism for the A2P registration, if it relies on web opt-in | whoever manages the registration | No, but note the form has no checkbox |

Sources read on 20 September 2026: flsenate.gov 2025 statutes (§§ 48.23,
689.15, 718.112, 718.116, 720.30851); the DBPR estoppel fee notice; Florida
Realtors' published FR/Bar-7 and ASIS-7x redlines; Cornell LII for 22 CFR 22.1,
26 CFR 1.1445-4, 11 U.S.C. § 363 and Fed. R. Bankr. P. 2002, 6004, 8002;
FindLaw's text of *Beal Bank*; CourtListener's dockets for *Chiusolo* and
*Medical Facilities*; FLOIR's filed ALTA 2021 Owner's Policy; the Florida
Department of State notary search; DNS via Google's resolver.
