# SEO and lead-generation plan

Written 22 September 2026, the day the domain moved to Vercel. It records what
was found, what has been fixed in code on `claude/compassionate-curie-sr6prx`,
and what is left, in the order it brings in leads. Research behind it: a
crawl of every rendered page, a read of the whole codebase, the live domain,
the website Supabase project, and a search of the Florida title SERPs and
Google's 2025–2026 guidance.

## What was wrong on the day

Three findings outweigh everything else put together.

1. **The live site was closed to every search engine.** `bayittitle.com`
   answered with `Disallow: /` in robots.txt and `noindex, nofollow` on every
   page. The indexing gate in `lib/seo.ts` demanded that Vercel's production
   host be `www.bayittitle.com` exactly; Vercel reports the *shortest*
   production domain, which is the apex, so the gate could never open. While
   it stays shut, Google drops the old Wix pages and indexes nothing new.
2. **The canonical host disagreed with the served host.** Vercel serves the
   apex and 308s `www` to it, while every canonical, sitemap URL and JSON-LD id
   named `www`. Every signal pointed at a redirect.
3. **Nobody is told about a lead.** `/api/health` reports Resend unconfigured
   in production. A form submission is saved to Supabase and no email goes to
   the office. (`leads` and `orders` hold 0 rows, so nothing has been missed
   yet.)

## Fixed in code

Each is a commit on the branch, with tests. Everything passes: lint,
typecheck, 765 unit tests, both builds, the 138-test browser suite at 14
widths, axe, and Lighthouse as a phone (accessibility, best practices and SEO
1.0 on all five pages measured, performance 0.94–0.97).

| Commit | What | Why it matters for leads |
|---|---|---|
| Open the live site to crawlers | Canonical host is the apex, `site.url = https://bayittitle.com`; the gate accepts apex or www; a stale `NEXT_PUBLIC_SITE_URL` naming www is ignored; production `*.vercel.app` aliases 308 to the real domain | Nothing ranks until this is deployed. |
| Check the live site as a crawler meets it | `npm run check:live` and `.github/workflows/live-seo.yml`, after every production deploy and daily; IndexNow submission of new and re-dated URLs | The failure above was invisible to CI. It cannot recur silently. |
| Title pages for what they are searched by | "Title company" (1.5× the searches of "title insurance") and a place in every title; the estimate page is the "Florida closing cost calculator"; library titles carry "Florida"; short descriptions rewritten; share images on 20 pages that had none; "a Orange County" grammar; the schema's forbidden 1031 wording | Titles are the largest on-page ranking signal and what earns the click. |
| Describe the firm in structured data | `InsuranceAgency` + `ProfessionalService`, 512px logo, services offered, `WebSite` on the homepage, `Service` + `areaServed` on county, city and services pages | Entity clarity for Google, its knowledge panel and AI assistants. |
| Put the phone number on every page | A click-to-call bar above the masthead; a quote CTA and call line in the homepage hero; a CTA on /team; every tel:/mailto: tap counted as a `contact_click` event with its page | Most title files start with a call, and a call left no trace in analytics. |
| The three most-searched cost questions | `/closing-costs/title-insurance-calculator`, `/closing-costs/doc-stamp-calculator`, `/closing-costs/who-pays-title-insurance` (all 67 counties, from the table) | Calculator and "who pays" queries are the highest-volume searches the firm can answer, and tools keep their clicks when AI Overviews answer the informational ones. `/rates` and `/calculator` now land on the calculator. |
| Stop printing one schedule 67 times | County pages link to the calculator instead of each printing both schedules; the 35 counties with no local fact are `noindex, follow` and out of the sitemap until the team adds one | Location pages were 91–94% identical and 74% of the site. Google's August 2026 spam update demoted whole sites with that profile, the pages that produce leads included. |

### One decision to know about

**35 county pages are crawlable but not indexed.** You asked for the site to
be fully open to crawlers, and it is: robots.txt allows everything except the
`/api/` form endpoints, which are not pages; every page is linked and
followable; AI crawlers are named and allowed. But a page that is the
template with a different county name in it is exactly what Google's
doorway-page policy describes, and 35 of 67 county pages were only that.
`countyHasLocalFacts()` in `lib/locations.ts` indexes a county page the build
after it gains any one local fact: a confirmed payer custom, the recording
office's own page, its published turnaround, or a city page. To index all 67
regardless, make that function return `true`. The recommendation is not to.

## What only people can do, in order

### Today — without these, the code changes do nothing

1. **Merge the branch to `main`.** Vercel deploys it; the first production
   deploy opens robots.txt and removes `noindex` everywhere. Then open the
   **Live SEO** workflow run in GitHub Actions (or run `npm run check:live`)
   and confirm it says `OK`.
2. **Turn on lead notifications.** In Vercel → Project → Environment
   Variables (Production): `RESEND_API_KEY` and `NOTIFY_FROM_EMAIL`. In Resend,
   add `bayittitle.com` as a sending domain and put the records it gives you
   in the **Wix DNS panel**, which still hosts the zone. Resend's records go on
   a sending subdomain and a DKIM key, so they sit beside the Microsoft 365
   `MX` and `v=spf1 include:spf.protection.outlook.com` records without
   touching them: leave those two alone, or office email stops. Then check
   `https://bayittitle.com/api/health` reports `resend` configured and send one
   test enquiry through the contact form.
3. **Delete or correct `NEXT_PUBLIC_SITE_URL` in Vercel** if it still says
   `https://www.bayittitle.com`. The code now ignores it and warns, but the
   variable should say what is true.
4. **Google Search Console.** Add a **Domain** property for `bayittitle.com`
   and verify it with the DNS TXT record Google gives you, in the Wix DNS
   panel. Submit `https://bayittitle.com/sitemap.xml`. Use URL Inspection →
   Request indexing on the homepage, the title insurance calculator, who pays,
   and the Broward, Palm Beach and Miami-Dade county pages.
5. **Bing Webmaster Tools.** Import the property from Search Console. Every
   sitemap URL already went to IndexNow with the first production deploy on
   23 September 2026 (72 URLs, accepted); to send them all again, run the
   **IndexNow** workflow by hand with **submit all** ticked.
6. **Vercel Firewall.** Check that Bot Protection is not challenging verified
   bots and that the "AI bots" managed ruleset is off: the site wants to be
   quoted by assistants (`app/robots.ts`). The MCP token could not read the
   firewall from here.

### This week — the map pack, where most local leads come from

Most "title company" searches are answered by Google's map pack, not by
organic results, and the map pack is ranked mainly on the Business Profile
and its reviews. The website supports it; it cannot replace it.

- **Google Business Profile.** Primary category **Title company**, secondary
  **Escrow service**. Keep the business name exactly "Bayit Title": adding
  keywords breaks Google's rules. Website: `https://bayittitle.com/`.
  Appointment link: `https://bayittitle.com/order`. List every service (title
  insurance, title search, escrow and closings, commercial, mobile signings,
  remote closings, 1031 closings). Service areas: Broward, Palm Beach and
  Miami-Dade, and the cities near the office, up to Google's 20 and within
  about two hours' drive; Tampa, Orlando and Jacksonville are won through the
  site and referrals, not the profile. Add real photos of the office, the
  signage and the team. Post monthly.
- **Reviews: a steady flow, every closing.** 92 five-star reviews is a strong
  base, but recency is ranked. Ask in the disbursement email with the direct
  review link, never with an incentive, and answer every review. The
  `review_requests` table exists for this and has no code yet; building that
  flow is the most valuable engineering task left.
- **Bing Places and Apple Business Connect**, with the same name, address,
  phone and hours. Bing's index is the one ChatGPT search and Copilot draw on.
- **Citations, cleaned and consistent.** Search results still show
  third-party business profiles (ZoomInfo, Key Crew and similar) describing the
  firm as working in Florida and Pennsylvania; find and correct them, since the
  site must never mention Pennsylvania. Claim or create: BBB, Yelp, a Facebook page, Birdeye (already 69
  reviews), the ALTA Registry, the FLTA member directory, First American's
  agent locator, the Broward, Palm Beaches & St. Lucie REALTORS and Miami
  REALTORS affiliate directories, and the Coral Springs Coconut Creek Regional
  Chamber. Yelp, BBB, Facebook and the realtor directories rank on page one for
  local "title company" searches themselves.
- **Counsel, before any co-marketing with realtors or lenders.** Fla. Admin.
  Code R. 69B-186.010 lists giving a real estate broker or sales associate an
  endorsement, preferred status or featured-partner status on a title
  agency's website as a prohibited inducement, and RESPA §8 applies on top. `/partners` describes what the firm does for agents and names none of
  them, which is the safe shape; keep it that way until counsel says
  otherwise.

### Weeks 2–8 — data that unlocks pages already built

Each of these is a row in the `locations` table. The next build turns it into
indexed pages, a longer who-pays table and better county pages, with no code.

- **Who customarily pays, for the 49 counties without it**, from the team's
  own files. Each one indexes a county page and fills a row on the who-pays
  table, which is the page most likely to be linked to and cited.
- **The recording office page and published turnaround** for the 38 counties
  without a `clerk_url`.
- **Municipal facts for the cities** (building-department permit search,
  code-enforcement records, how a municipal lien search is answered), checked
  and dated. Then add city pages for the Broward and Palm Beach cities near the
  office: Parkland, Coconut Creek, Margate, Tamarac, Sunrise, Plantation,
  Weston, Pompano Beach, Deerfield Beach, Delray Beach and Boynton Beach. Add
  them **only with those facts**: a city page without them is another doorway.

### Ongoing — the library, by lead value

One page a week, the cadence in `docs/claude-project-brief.md`: raw notes from
a real file, a draft, then the licensed review. Ordered by who searches and
how ready they are to hire:

1. **For-sale-by-owner closings in Florida.** With no agent, the buyer or
   seller picks the title company themselves: the highest-intent consumer
   search there is.
2. **Selling inherited or probate property in Florida**, including enhanced
   life estate deeds and trusts.
3. **Condo closings in South Florida:** SIRS and milestone inspections, the
   association's documents, estoppel timing and fee caps.
4. **Foreign buyers and sellers:** FIRPTA withholding and remittance,
   alongside the existing signing-from-abroad page.
5. **Judgment liens and homestead:** "can I sell a house with a judgment lien
   in Florida".
6. **How to verify a Florida title agency, and wire fraud:** the DFS lookup,
   the ALTA Registry, the underwriter, and seller-impersonation fraud. It earns
   trust and links from local news.
7. **Municipal lien searches and estoppel letters.**
8. **How long a Florida title search and closing take**, and what delays them.
9. **The closing side of a 1031 exchange**, with the separate-company rule in
   `lib/site.ts`.
10. **Cash and investor closings**: assignments and double closings.

Also queued: a **seller net sheet** (realtors hand these to clients, and it
is the tool competitors use to win agents), and an **"email me this
estimate"** on the calculators, which turns an anonymous visitor into a lead.
The second needs a privacy-policy change before it ships.

## Measuring it

- **Search Console, weekly:** indexed pages (Pages report), queries and
  clicks per page. Expect the brand and the homepage within days of the
  deploy; calculators, who-pays and county pages over weeks to months.
- **Leads by page:** Vercel Web Analytics custom events. `form_submit`
  (order, quote, contact, contract) and `contact_click` (phone, email) each
  carry the page. Custom events need Vercel Pro; on another plan they are sent
  and not recorded. Submissions also store `page_path` in Supabase.
- **Monthly:** which pages produce calls and forms, and which county pages
  have impressions and no clicks. Improve those before writing new ones.
- **Quarterly:** the 20-prompt AI visibility audit into `ai_audit_log`, as the
  brief already plans.

## What this plan deliberately does not do

- **No superlatives, no comparisons, no invented facts.** Florida regulates
  title agency advertising, and the site's authority is that every figure is
  cited. Competitors ranking with "best title company" pages are taking a risk
  this firm does not need to take.
- **No `AggregateRating`.** The reviews are Google's, and marking them up as
  the firm's own rating on its own site is self-serving review markup: at best
  ignored, at worst a manual action.
- **No mass city or "city × service" pages.** They rank for a while and then
  take the whole site down with them. That pattern is what the 2026 updates
  hit.
- **Nothing that guarantees a ranking.** What is certain: once this is
  deployed, Google can index the site, every page has the right canonical,
  title, structured data and share card, and the highest-demand questions have
  pages built to answer them. How far and how fast it ranks depends on the
  Business Profile, reviews, citations and the library, which are the people
  work above.

## Where things are in the code

- Indexing gate and canonical host: `lib/seo.ts`, `lib/site.ts`,
  `next.config.mjs` (`CANONICAL_ORIGIN`, `productionAliasRedirects`)
- Live check and IndexNow: `scripts/check-live-seo.mjs`, `scripts/indexnow.mjs`,
  `.github/workflows/live-seo.yml`, `.github/workflows/indexnow.yml`,
  `public/<key>.txt`
- County gate: `countyHasLocalFacts` in `lib/locations.ts`
- New pages: `app/closing-costs/{title-insurance-calculator,doc-stamp-calculator,who-pays-title-insurance}`
- Call tracking: `components/ContactClickTracking.tsx`; the call bar in
  `components/SiteHeader.tsx`
