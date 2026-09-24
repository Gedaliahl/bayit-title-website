# Production-readiness plan

Written 22 September 2026 as the list of work, in order. **The work has since
been done on this branch; the next section says what state it is in and what
is left for people to do.** The plan below it is kept as written, as the record
of what was found and why each change was made.

## Status, 22 September 2026

Every item in Phases 0–9 that could be settled in code is done, and the firm
answered D1–D6. What the branch now proves on every run:

- `npm run lint`, `npm run typecheck`, `npm test` (668 tests) and
  `npm run build` pass, and `npm audit` finds 0 vulnerabilities.
- `npm run test:e2e` passes, 138 tests in a real browser. It covers:
  - every sitemap page, the homepage included, at 14 widths from 280 to
    2560px, checking for sideways scroll, console errors, one h1, heading
    order, alt text and tap targets;
  - axe, WCAG 2.2 AA, at 375 and 1280;
  - the flows: the menu, both estimator modes and every error state, the three
    forms, both upload boxes, and the homepage's pause switches.
- `npm run lhci`, run as a phone: performance 0.93–0.96, and accessibility,
  best practices and SEO all 1.0. The pages measured are /estimate, a county
  page, a library page and /order.

### The firm's answers, and what changed

| | Answer | Change |
|---|---|---|
| D1 | The rule's $25 is a minimum for a simultaneous lender's policy, not a price or a maximum. | The $125 charge stands. The county, city, buyer and estimate pages now call $25 the least the policy can be. |
| D2 | The excess over the owner's amount is layered: the original rate at the loan amount less the original rate at the owner's amount. | `excessLoanPremium` works that way, and tests pin it. On a $1.5M loan over a $1M owner's policy the excess is $1,250, where it was $2,575. |
| D3 | Take "excellence" out if it is a problem. | Removed from About, Partners and the homepage. |
| D4 | The exchange company has no connection to us. | The homepage, Services, Partners, About and llms.txt no longer say we facilitate exchanges "through" it. They say we close with whichever intermediary the client chooses; the ticker's pill reads "1031 closings". |
| D5 | Do not promise that data is deleted or not kept. | Every retention and non-retention promise is gone from the estimate page and the privacy policy. The purge stays in the code, and it runs only once `CRON_SECRET` is set. |
| D6 | The SMS section stays; it is there for RingCentral. | Unchanged. |

### Still with the firm (the site is live-safe without them)

1. **Practice claims stated as fact.** Confirm each one, or say which to soften.
   - "Search ordered the same day": `app/services/page.tsx:34`,
     `app/partners/page.tsx:77`, `:182`, and on the homepage the example file
     card's "Search and estoppel ordered the same day"
     (`components/FileTimeline.tsx`).
   - "In writing, the same day" (homepage hero, `app/page.tsx`).
   - "Read by a person, day one": `app/services/page.tsx:152`.
   - "Instructions confirmed by voice": `app/services/page.tsx:154`, `:244`,
     `app/about/page.tsx:49`.
   - "Open the file today": `app/services/page.tsx:332`.
   - "The file number the same business day": `app/partners/page.tsx:173`.
   - "Usually the same business day" (quote): `app/quote/page.tsx:76`.
   - "Picked up the next business morning": `app/order/page.tsx:36`.
   - "We order a municipal lien search on every file":
     `app/cities/[slug]/page.tsx:278`, `app/closing-costs/seller/page.tsx:210`.
   - "Week one … not week six" and "the first week":
     `app/about/page.tsx:160`, `app/partners/page.tsx:16`, `:51`, `:60`.
   - Volume: "Our busiest counties" (`app/counties/page.tsx:146`), "Most
     files are in" (`app/about/page.tsx:265`) and "Most of our files sit in"
     (homepage, `app/page.tsx`).
2. **"We e-record in this county."** The field records the office's own
   practice, and it is set to true for Broward, Palm Beach, Miami-Dade,
   Hillsborough, Orange and Duval. Confirm it holds for each.
3. **Who-pays sources.** On about 20 county rows the source for the
   owner's-policy custom names other title firms and a 2021 chart. Keep them
   or replace them.
4. **The address estimate now leads with the just value**, with the assessed
   value offered beside it. Confirm that is the figure to lead with.
5. **The purge.** Switch it on or leave it off (`CRON_SECRET`), and choose the
   ages: 30 days for contracts, and 90 for order documents from the original
   schema.
6. **The privacy policy's effective date** moved to 22 September 2026, because
   the page promises a new date on any change.
7. Chaya's bio says signing day "doesn't have to be a stressful event", which
   is close to the banned "stress-free". It is her own wording.

### Still with whoever holds the accounts

1. ~~Apply the migrations.~~ Done 22 September 2026: 000100–000500 applied
   to the website project and recorded in its migration history. The anon
   insert policies are gone, and the security advisor shows only the
   intended "RLS on, no policy" notices.
2. **Environment variables in Vercel.** `.env.example` documents each one.
   - Required: `RESEND_API_KEY` and `NOTIFY_FROM_EMAIL`. Without them the
     office is never told about a submission, and `/api/health` answers 503.
   - `SUPABASE_URL` and the service-role key must be present at **build**
     time. A production build now fails without all 67 counties.
   - Recommended: `LOOKUP_SIGNING_SECRET`.
   - Optional: the Turnstile pair, `CRON_SECRET`, `QUOTE_RETENTION_DAYS`,
     `ARCGIS_API_KEY` and `ESRI_DAILY_GEOCODE_CAP`. Run
     `tests/geocoder.live.test.ts` with the Esri key before switching Esri on.
3. **A Vercel Firewall rate-limit rule on `/api/*`.** The in-process limiters
   are a second line only.
4. **An uptime monitor on `/api/health`.** It fails if Supabase, the bucket,
   Resend or a configured Turnstile secret is wrong.
5. **The first GitHub run of the new CI jobs.** The e2e job (Chromium, WebKit,
   Firefox) and the Lighthouse job have run only locally, on Chromium.
6. **A pass on real devices and screen readers** (Phase 9, item 7). No
   automated run replaces it.
7. **The cutover steps** in `docs/go-live-status.md`: DNS with the Microsoft
   365 records kept, the domain, and Search Console.

### Deliberately not done

- `noUncheckedIndexedAccess` is off. Turning it on raises 136 errors across
  lib/ and tests/, which is a change of its own.
- TypeScript 7 and ESLint 10 wait on typescript-eslint and
  eslint-config-next respectively; both still break lint.
- Pixel screenshot tests would be flaky across CI fonts. The 14-width walk
  checks layout without them.
- Next logs `NoFallbackError` for every 404 under a segment with
  `dynamicParams = false`. That is the framework's behaviour, not a failure.

## How this was found

- **The repo's own checks, run clean:** `npm run lint`, `npm run typecheck`,
  `npm test` (230/230) and `npm run build` (73 routes).
- **A production build, served and driven in headless Chromium.**
  - Every non-home route was checked at 14 widths: 280, 320, 360, 375, 390,
    414, 568, 768, 820, 1024, 1280, 1440, 1920 and 2560 px.
  - At each width the check looked for horizontal overflow, console and
    network errors, heading order, missing alt text, small tap targets and the
    smallest font size.
  - Screenshots were reviewed at 320, 375, 768, 1440 and 2560.
- **Interactions tested by hand in the browser:** the mobile menu (Escape,
  Tab, closing on navigation), the estimator's inputs and the order API.
- **Five parallel line-by-line audits:**
  1. The calculator arithmetic.
  2. The address-to-value pipeline, including the live county endpoints (all
     40 roll tests pass live).
  3. Forms, uploads and API security.
  4. Page templates and copy.
  5. The global shell, CSS, accessibility and SEO.
- **Read-only queries against the website Supabase project,** to check the real
  constraints, the RLS policies and the data.

## Where it stands

The foundation is strong, and the work below is mostly finishing, not
rebuilding.

**Already sound. Keep it, don't redo it:**
- The draft/VERIFY publishing gate.
- The CSP and security headers.
- The storage-path design.
- The SQL escaping in the lookup code.
- No SSRF.
- The premium, doc-stamp, intangible-tax and recording arithmetic. It was
  checked at every tier boundary.
- Draft pages are gated everywhere they could leak.
- Every internal link resolves.
- One h1 per page.
- **No horizontal scroll at any width from 280 to 2560px on any page.**

**What is not ready:**
- Nine things break for a real user today. They are listed in Phase 0.
- Six items are legal or compliance calls that only the firm, its underwriter
  or counsel can make.
- A long tail of UX, accessibility, SEO and robustness gaps, which Phases 1–9
  cover.

Severity: **P0** blocks launch · **P1** fix before launch · **P2** fix in the
first two weeks · **P3** polish.

---

## Phase 0 — Launch blockers (P0)

Each of these was confirmed in the code, the database or a running browser.

| # | Problem | Where | Proof | Fix |
|---|---|---|---|---|
| 0.1 | **Orders and quotes fail with a 500 when County is left on "Select…".** The field is labelled optional, so this is the normal path. `''` is inserted as `county_slug`, and the live foreign key `orders_county_slug_fkey` / `leads_county_slug_fkey` rejects it. `orders` and `leads` both hold **0 rows**, so no web submission has ever landed. | `components/Field.tsx:101`, `lib/schemas.ts:44,72`, `app/api/orders/route.ts:61`, `app/api/leads/route.ts:43` | FK read from the live DB; the empty string traced through the schema. | Add an `optionalText()` helper that maps `''` to `null`, and use it for every optional string. Validate `county_slug` against the known slugs so a bad value gets a 422, not a 500. Add a route-handler test that exercises the insert. |
| 0.2 | **The honeypot is named `company`.** Browser and password-manager autofill fill it, and the server then returns `{ok:true}` and **silently discards the real order**. | `components/Field.tsx:176-182`; `orders/route.ts:37`, `leads/route.ts:30`, `contract-quote/route.ts:57` | Code path. | Rename the field to something with no autofill meaning, and set `autocomplete="new-password"`. When the trap trips, store the row with `status='spam'` rather than dropping it. |
| 0.3 | **Decimals are stripped from money fields.** Typing or pasting `450,000.00` becomes **$45,000,000**, and every figure is multiplied by 100. `1e6` becomes 16. Over 309 digits shows "$∞". | `components/estimate/CalculatorPane.tsx:38-41` | Reproduced in the browser. | Parse up to the first `.`, reject exponents, cap amounts (for example at $100M) with a visible message, and cap pages at 1–500 with a message. Add unit tests. |
| 0.4 | **The order page prints a broken sentence:** "…and Saturday – Sunday  to ;". | `app/order/page.tsx:33-35` | Seen in the served HTML. | Use `officeHoursLine`. Add a test that no page reads `site.hours[n]` by index. |
| 0.5 | **Nobody is told about a submission unless `RESEND_API_KEY` is set.** The key's absence is logged at `info`. The user is also told to "reply to the confirmation email", and no confirmation email is ever sent. | `lib/submissions.ts:60-90`, `OrderForm.tsx:219`, `content/estimate.ts` (`UPLOAD.sent.missing`) | Code path; the README says the key is unset. | Set the key. Make its absence in production an error-level log and a failed health check. Send the submitter an acknowledgement, or change the copy to "email {ordersEmail}". |
| 0.6 | **A build without Supabase quietly ships 6 county pages instead of 67.** The other 61 return 404 and drop out of the sitemap, while `llms.txt` still says "all 67". One bad build could de-index most of the county pages. | `app/counties/[slug]/page.tsx:53-57`, `lib/locations.ts:261` | This session's build: `/counties/alachua-county` returned 404. | Fail a **production** build (`VERCEL_ENV=production`) when Supabase is unreachable or returns fewer than 67 counties. Alternatively, ship the 67 county names statically and use Supabase only for detail. |
| 0.7 | **The office hours contradict each other on a published page.** The signings page says Mon–Thu 9–5 and Fri 9–12; `lib/site.ts`, the footer, /contact and the JSON-LD say Mon–Fri 9–5. | `content/services/mobile-and-remote-signings.md:28` | Grep. | The firm confirms the hours (the Sep 16 commit says Mon–Fri 9–5). Correct the page and re-review it. Update `docs/HANDOFF.md`. |
| 0.8 | **Duplicate H2 on the published HOA page.** It renders an empty section, and the rail lists the question twice. | `content/title-problems/hoa-approval-delay-closing-florida.md:40,42` | Grep. | Delete line 40. Add a build check that fails on a section with an empty body. |
| 0.9 | **Banned superlative on a published page:** "The fastest turnaround we have documented…". | `hoa-approval-delay-closing-florida.md:23` | Grep, against the handoff's voice rules. | Rephrase, e.g. "We have seen it done in two days…", then re-review. |

### Decisions only the firm, its underwriter or counsel can make (P0 — needed before launch)

These are not code questions. Each has a ready fix once the answer is in.

| # | Question | Where | Why it matters |
|---|---|---|---|
| D1 | **Is the $125 "lender's policy, issued simultaneously" line lawful as printed?** Rule 69O-186.003 and § 627.782 fix the simultaneous-issue premium at **$25**. | `lib/agency-charges.ts:537,577-582` | A line labelled as the policy at 5× the promulgated premium looks like charging above the rate. If the extra $100 is a lawful service charge, show it as two lines: "premium $25 (rule)" and "issuance/services $100 (Bayit Title)". |
| D2 | **How is a loan above the owner's policy amount rated?** The code rates the excess from the first $100k bracket. The common reading (and most underwriter calculators) is `premium(loan) − premium(owner)`. | `lib/promulgated-premium.ts:181-199` | At $1.5M loan over a $1M owner's policy, the code gives **$2,700** against **$1,375** under the other reading, a difference of **$1,325**. The code already uses the aggregate reading for reissue excess, so it is inconsistent with itself. First American should confirm. |
| D3 | **"Excellent" / "one standard: excellence" as self-description.** | `app/about/page.tsx:21,141,153`, `app/partners/page.tsx:58` | The firm asked for it (commit 3b4ca9e). The voice guide says authority comes from specificity, because Florida regulates title advertising. A licensed person should decide. |
| D4 | **1031 wording implies an affiliated arrangement.** | `app/services/page.tsx:225-229`, `app/partners/page.tsx:142-146` | `lib/site.ts:89-100` says it must not. Proposed replacement: "we coordinate the closing with whichever intermediary you choose". |
| D5 | **The contract "is not kept past the quote", but nothing deletes it.** | `content/estimate.ts:328,486`; no purge job exists | Either build the purge (Phase 3.9) or soften the promise. The privacy page also needs a paragraph on contract uploads. |
| D6 | **SMS consent.** The privacy policy describes a web-form SMS opt-in that does not exist. | `app/privacy/page.tsx` §4 | Add an unchecked consent box with the carrier disclosure and store the consent (Phase 3.8), or rewrite §4. This matters if the A2P 10DLC registration cites the website. |

---

## Phase 1 — The estimator: calculations and behaviour (P1)

What is already right, checked numerically:
- The original premium schedule at every tier boundary ($100k → $575; $1M →
  $5,075; $10M → $26,325).
- The $100 minimum and rounding up to the next $100.
- The reissue schedule and the (2)(c) excess split.
- Deed stamps (70¢, or 60¢ + 45¢ in Miami-Dade, per $100 or fraction).
- Mortgage stamps, intangible tax and recording ($10 + $8.50).
- Buyer/seller allocation, refinance and cash handling.

Keep these, and pin them with tests (1.12).

| # | Pri | Item | Where | Fix |
|---|---|---|---|---|
| 1.1 | P1 | The "seller carries about $X" figure double-counts the owner's policy in the 48 counties whose custom is unverified. The line is counted in both parties' totals. | `lib/closing-estimate.ts:388-390`, `lib/assessed-estimate.ts:382-384` | Leave `either` lines out of `otherPartyTotal`, and add "plus the owner's policy, which the contract assigns". |
| 1.2 | P1 | Address mode overstates the lender's line: it rates the loan excess over the *assessed* value, not the price. Assessed $250k with a $400k loan gives $950, where the numbers mode gives $125. | `lib/assessed-estimate.ts:203` | Rate the loan against the just value (or the price once it is known), or say on the line that it is overstated. |
| 1.3 | P1 | Clearing the price on a purchase still shows the loan taxes ($2,419.50) with no lender's policy and no prompt. | `closing-estimate.ts:222,290,347` | If it's a purchase and the price is 0, show the empty state: "Enter the price". |
| 1.4 | P1 | A refinance charges full mortgage stamps and intangible tax with no caveat, although §§ 201.09 and 199.145 can reduce both on a renewal. | refinance lines | Add a one-line note on each, with the statute cite. |
| 1.5 | P1 | The copy overstates what the figures are: "Exact, from the contract" and "Every figure is set by the rule or the statute". The $125 and $5.50 lines are the agency's own. The hero also says "nothing sent to us", but address mode POSTs to our server. | `content/estimate.ts:45,59,86-89` | Change to "Close, from the contract numbers", "every figure cited to whoever sets it", and "nothing stored; the address is only used to look up the county record". |
| 1.6 | P1 | The address-mode default is the Save Our Homes-capped *assessed* value. On long-held homesteads that can be half the market value, so it under-quotes. "Assessed" also means different things by county, and the label never changes even when the box holds the just value. | `CalculatorPane.tsx:210-221`, `lib/county-rolls.ts` | Default to the just value where the county has one, and offer assessed as the alternative. Relabel the box "Value used" and name the figure in the premium line. Show the homestead flag and the last sale price where the roll has them. |
| 1.7 | P1 | The results card is one big `aria-live` region, so every keystroke re-announces dozens of nodes. | `components/estimate/FigureCard.tsx:174` | Remove `aria-live` from the card. Add one visually-hidden, debounced (500 ms) region that reads "Buyer's side: $5,152". |
| 1.8 | P1 | The mode tabs lack the tab keyboard pattern: no arrow keys, no roving tabindex, no ids or `aria-labelledby`, and two tabs point at the same panel. The `.seg` radio groups have the same problems. On the tabs, focus looks identical to selected. | `Estimator.tsx:34-65`, `CalculatorPane.tsx:541-586`, `globals.css:2032-2038` | Implement the ARIA tabs pattern, or use a button group with `aria-pressed`. Use native radios for `.seg`. Give focus a distinct ring. |
| 1.9 | P2 | Nothing can be kept or shared: no reset, copy, print or share, and a refresh loses every input. | numbers mode | Keep the inputs in the query string (`?mode=numbers&price=…`). Add Reset, Copy summary and Print buttons, plus print CSS (Phase 4.9). |
| 1.10 | P2 | On phones the form sits several screens down, below the hero, the router card and three stacked tab cards, and the total is far below the fields. | `/estimate` at 320–414 | Compact the tab cards into a segmented control under 40rem. Add a sticky bottom bar on phones showing the running total with a "See breakdown" link. |
| 1.11 | P2 | Smaller problems: <br>• Clearing the page counts silently drops the recording lines. <br>• The caret jumps to the end while editing a formatted number. <br>• A "Tax on the transfer" heading appears on refinances. <br>• Money formatting mixes "$2,575" and "$5.50" in one column. <br>• The seller's "not in it" list is written for a buyer. <br>• The page-count examples differ between pages (3/25 vs 2/12). <br>• Reissue savings should read "up to" when the prior amount is unknown. <br>• `setMode` doesn't move focus. <br>• Smooth scrolling ignores reduced motion. | `closing-estimate.ts:138,324,372`, `CalculatorPane.tsx:96`, `statutory-rates.ts:357`, `seller/page.tsx:68,175` | Fix each as described. Share one page-count constant. |
| 1.12 | P1 | The tests are relational, so a wrong rate constant would pass. | `tests/estimate.test.ts` | Add fixed-number tables for each tier boundary, deed, mortgage, intangible and recording figure, and the lender excess (after D2). Add parsing tests for 0.3. |

---

## Phase 2 — Address → value lookup (P1)

All 20 county roll endpoints and their fields were confirmed live on
2026-09-22. The SQL escaping is correct and there is no SSRF.

| # | Pri | Item | Where | Fix |
|---|---|---|---|---|
| 2.1 | P1 | **A stale value lookup overwrites the current property.** Lookups can take about 38s and nothing cancels them. Pick a Volusia address, then a Broward one, and the Volusia figure and county land later under the Broward address. | `CalculatorPane.tsx:223-283` | Keep an AbortController and a lookup id in a ref. Abort on a new pick, typing, manual entry or a county change, and apply a result only if its id is still current. |
| 2.2 | P1 | **Condos can return another unit's value.** `features[0]` is taken from stacked polygons, and the address check ignores unit numbers. Tested: Apt 1001 returned unit 1002's value. | `lib/property-lookup.ts:661`, `lib/address-format.ts:231-252` | Match the unit exactly when both sides have one. When there's no unit and several features come back, decline and ask "which unit?". Strip unit markers from the roll prefix, since Miami-Dade stores `… DR 1401`. |
| 2.3 | P1 | The address-matching guard is too loose. "Oak St" matches "Oakland St", "Pa Ave" matches "Palm Ave", and "North Federal Hwy" doesn't match "N Federal Hwy". Saint/St and Mount/Mt aren't treated as equivalent. | `address-format.ts:128-168,219-275` | Allow prefix matches only for known abbreviation pairs. Normalise spelled-out directionals and Saint/Mount. Handle "Unit 5" after a comma, apostrophes, and house numbers like "12-34". |
| 2.4 | P1 | ArcGIS returns HTTP 200 with `{error}`, and the result is **cached for an hour for every user**, which silences a county's rows. The cache also stores address-bearing URLs, which contradicts the privacy copy. | `property-lookup.ts:318`, `geocoder.ts:111` | Use `cache: 'no-store'` plus a small in-process LRU that skips error bodies. Reword the privacy paragraph to say the address goes to the county, Census and Esri in their request URLs. |
| 2.5 | P1 | Errors are mislabelled. A 429, 5xx or network failure reads "No property found". A timeout reads "the roll declined". In 53 of 67 counties the unavailable/declined message isn't shown at all. | `CalculatorPane.tsx:186-193,236,418-434`, `property-lookup.ts:697-705` | Give the client distinct states (none, rate-limited, unavailable, declined) and render them regardless of whether the county has an appraiser link. Add a "Try again" button. |
| 2.6 | P1 | **Unlimited paid Esri geocodes.** Anyone can POST any magicKey. The limiter is in-memory, per instance, and allows everything when there is no IP. | `app/api/parcel-value/route.ts:37-82`, `geocoder.ts:141` | HMAC-sign lookups when suggestions are issued. Add a daily global cap. Add a Vercel WAF rate-limit rule on `/api/*`. Refuse requests that have no fingerprint. |
| 2.7 | P2 | With an Esri key set, every house is listed twice, because the dedupe key includes an empty county slug. | `property-lookup.ts:1189,1209` | Key on address and city. Treat an empty county as a wildcard. |
| 2.8 | P2 | No overall deadline. Worst case is about 12s+ per keystroke with 23 upstream requests. Aborts don't reach the upstream calls. No `maxDuration` is set. | `property-lookup.ts:1131-1166` | Use `AbortSignal.any([request.signal, AbortSignal.timeout(6000)])` across the whole search. Set `export const maxDuration`. Add a client timeout on the value fetch. |
| 2.9 | P2 | Combobox problems: <br>• "Looking…" can stick. <br>• The list reopens after blur. <br>• The active option can scroll out of view. <br>• Clicking the scrollbar closes the list. <br>• `aria-controls` points at an unrendered id. <br>• No result count is announced. <br>• No Home/End, and Enter doesn't check for IME composition. <br>• There's no `maxLength`. | `CalculatorPane.tsx:173-196,293-298,472-528`, `globals.css:2301-2317` | Fix each. Anchor the list with `top:100%` inside its own wrapper, set `max-height:min(22rem,45dvh)`, and scroll the input into view on focus on phones. |
| 2.10 | P2 | A non-Florida address ("…Atlanta, GA 30303") returns a Tampa row. The ZIP is ignored. | `property-lookup.ts` | Reject a non-FL state or a ZIP outside 32xxx–34xxx with "Florida properties only". Rank rows by the typed ZIP. |
| 2.11 | P3 | Smaller problems: <br>• Orange County prints the unit twice. <br>• Casing mangles words: "Mcdonald", "A1a", "O Brien". <br>• Palm Beach common-area rows valued at 0 appear. <br>• Dead code: `parcelById`, `countyFeaturePoint`, `roll.filter`. <br>• `lastWave` suppressed by rows that fail the score threshold. <br>• No identifying User-Agent on requests to public services. <br>• Esri `findAddressCandidates` lacks `singleLine`, and the geocoder live tests have never run with a key. | `property-lookup.ts:452,1152`, `address-format.ts` | Fix each. **Run `tests/geocoder.live.test.ts` with a real key before switching Esri on.** |

---

## Phase 3 — Forms, uploads and security (P1)

What is already right:
- Storage paths are generated, not user-supplied.
- The bucket is private, with a MIME allow-list that matches the code.
- The confirm step checks against the bucket listing.
- The order is saved before tickets and notifications.
- Forms use fieldset/legend, labels and `aria-describedby`, and move focus to
  the first error.
- The wire-fraud notices are present.

| # | Pri | Item | Where | Fix |
|---|---|---|---|---|
| 3.1 | P1 | **Duplicate orders on slow responses.** No client timeout and no idempotency key. `notify()` is awaited, so a hung Resend call leads to a 504, the user sees "could not reach the server", and they resubmit. | `OrderForm.tsx:133-161`, `LeadForm.tsx:42-71`, `UploadPane.tsx:119-146`, `submissions.ts:70` | Send a client `submission_id` with a unique index on it. Use `AbortSignal.timeout` on the client and on Resend. Move notification into `after()` from `next/server`. Check the response content type before `.json()`. |
| 3.2 | P1 | **Bot protection and file checks.** There is no captcha, and the file type is never checked against the bytes. Uploaded files reach a title agency's inbox as links, which is a BEC and wire-fraud vector. | `orders/route.ts:71`, `document-storage.ts:117-184` | Add Cloudflare Turnstile or Vercel BotID on `/api/orders` and `/api/contract-quote`. At confirm time, check each file's magic bytes (PDF, JPEG, PNG, HEIC, DOCX) and delete mismatches. Consider an antivirus scan. |
| 3.3 | P1 | Only the client's *declared* sizes are checked. One order can store 10 × 25 MB = 250 MB, against the 60 MB promised. Tickets are indexed by position in the filtered list, not the client's own list. | `orders/route.ts:40-48`, `contract-quote/route.ts:62-73`, `document-storage.ts:75-88` | At confirm time, sum the actual object sizes and delete anything over the limits. Carry the original index through. Tighten the schema's `.max(20)` to `MAX_FILES`. |
| 3.4 | P1 | Cross-site form posts. `text/plain` bodies parse as JSON without a CORS preflight. | all four POST handlers | Return 415 unless the body is `application/json`. Check `Origin` / `Sec-Fetch-Site`. |
| 3.5 | P1 | The office email can be forged and lost. User text comes before the system lines, the subject can contain CR/LF, and there's no `reply_to`. | `submissions.ts:93-96`, `orders/route.ts:75-83`, `contract-quote/route.ts:109-122` | Strip CR/LF from subjects. Put the system fields first and quote the user's text beneath them. Set `reply_to` to the submitter. |
| 3.6 | P1 | Download links in the email stay valid for seven days, for contracts, payoffs and IDs. | `document-storage.ts:28` | Shorten the TTL to 24h or less, or link to an authenticated admin view. |
| 3.7 | P1 | **The database schema isn't in the repo.** Live anon `INSERT … WITH CHECK (true)` policies on `leads` and `orders` let anyone with the public anon key bypass validation, the honeypot and the rate limit. | `supabase/migrations/` | Dump the live schema into a migration. Drop both anon INSERT policies; the app only uses the service role. |
| 3.8 | P1 | SMS consent (D6). | the three phone fields | Add an unchecked opt-in with the disclosure, and store `sms_consent`, `sms_consent_at` and the text version. |
| 3.9 | P1 | Retention (D5). | bucket `quotes/*` | Add a scheduled purge, a Supabase cron or a Vercel Cron, for `quotes/*` and the related lead after N days. Also add the 90-day purge for `orders/*` if it is meant to exist. |
| 3.10 | P2 | Upload UX: <br>• Progress is per file, with no bytes. <br>• No cancel and no `beforeunload` warning. <br>• Files over the limit, duplicates and mixed batches are dropped silently. <br>• With zero files attached, the copy reads "0 files received". <br>• Remove buttons are 13–18 px. | `UploadPane.tsx:72-89,164-173`, `OrderForm.tsx:173-184`, `globals.css:1084,2598` | Use XHR `upload.onprogress`, a Cancel button and a `beforeunload` handler. List rejected files. Fix the copy. Make remove buttons at least 44 px. |
| 3.11 | P2 | Success and error announcements. <br>• Success screens mount a live region that already contains its text, so it isn't read, and focus is lost. <br>• Every field error is `role="alert"`, so several fire at once. <br>• UploadPane errors aren't tied to their fields. | `OrderForm.tsx:204`, `LeadForm.tsx:74`, `Field.tsx:36`, `UploadPane.tsx:108,372` | On success, move focus to the heading (`tabIndex=-1`). Drop `role="alert"` on field errors. Use `useErrorFocus` in UploadPane. Add an error summary on the long order form. |
| 3.12 | P2 | Validation. <br>• Impossible dates (`2026-02-31`) are accepted and then cause a 500. <br>• `'1e5'` and `'0x10'` are accepted as money. <br>• Phone numbers aren't checked. <br>• Nested errors can't be displayed. <br>• Errors stay visible after the user fixes the field. <br>• There's no client-side zod, although the schema comment says there is. | `schemas.ts:1-27,79-84` | Use `z.iso.date()` and a strict money regex. Normalise phone numbers. Run the same zod schemas in the browser on blur. |
| 3.13 | P2 | Smaller problems: <br>• Order references come from `Math.random` and can collide. <br>• The rate limiter lets requests through when its own check fails. <br>• `ip_hash` has no index. <br>• Quotes share the lead budget. <br>• Personal data appears in "not configured" logs. <br>• The office email says "none attached" when minting failed. <br>• The confirm endpoints re-email every time they're called. <br>• `force-dynamic` is redundant and no `maxDuration` is set. | `orders/route.ts:16-21,80`, `submissions.ts:47,63,85` | Use `crypto.randomInt` and retry on a unique violation. Index `ip_hash`. Give quotes their own bucket. Scrub the logs. Dedupe the confirm emails. Remove `force-dynamic`. |
| 3.14 | P2 | Form conversions can't be measured. | — | Add Vercel `track()` events for submit success and failure and for upload failures, with no personal data. |

---

## Phase 4 — UI and layout at every screen size (P1/P2)

**The target:** pixel-clean at 280, 320, 360, 375, 390, 414, 568 (landscape
phone), 768, 820, 1024, 1280, 1440, 1920 and 2560. Today there is no
horizontal overflow at any of these widths. What remains is fit and finish.

| # | Pri | Item | Where | Fix |
|---|---|---|---|---|
| 4.1 | P1 | **The mobile header wraps to two rows below 350px** (280–340). The Menu button drops under the wordmark and the header grows from 81 to 111px. | `globals.css:39`, masthead | Under 22rem: set `--gutter:1rem` and gap `.75rem`, shrink the wordmark slightly, and visually hide the word "Menu" (keep it as the accessible name). Replace the ☰/✕ glyphs with an inline SVG, since they fall back to a platform font. |
| 4.2 | P1 | **Mobile menu:** Escape doesn't close it, tapping the current page's link or a `?mode=` link leaves it open, focus drops to `<body>` after navigating, and it stays open when resized to desktop. All confirmed in the browser. | `components/SiteNav.tsx:46` | Escape closes the menu and returns focus to the toggle. Each link's `onClick` closes it. Close on a `matchMedia` change. It's a push-down disclosure, so no focus trap is needed. |
| 4.3 | P1 | Form controls are almost invisible as boxes. Borders are 2.08:1 (`--rule-strong`) and 1.34:1 (`.form-card`), and `.form-card` removes the focus outline. | `globals.css:1011,2122-2145` | Add a control-border token at about `#8a7f6a` (≥3:1 on white and band). Use a 2px focus ring on every input. |
| 4.4 | P1 | `.figure-card` is sticky with no `max-height`. On a ≤768px-tall laptop, the bottom of the card can't be reached. | `globals.css:2379` | Add `max-height: calc(100dvh - 3rem); overflow:auto`, or make it sticky only under `@media (min-height: 50rem)`. |
| 4.5 | P2 | Breadcrumb links are 21px tall on phones, footer links 20px, and the estimator checkbox 18px. | crumbs, `.sitefoot`, estimate | Use `display:inline-block; padding-block:.35rem` to reach 44px targets without changing the look. Make the checkbox hit area at least 24px. |
| 4.6 | P2 | No `overflow-wrap` anywhere. Nothing overflows today, but Markdown prose (statute URLs, emails, licence strings) has no guard at 280px. | `globals.css` | Set `body{overflow-wrap:break-word}`, and `anywhere` on `.prose`, `dd` and figure labels. |
| 4.7 | P2 | `.prose table{display:block}` strips table semantics in Safari/VoiceOver. | `globals.css:699-703` | Wrap tables in a scrolling `<div>` in the Markdown renderer, and keep the table's own `display:table`. |
| 4.8 | P2 | Large screens: at 1920 and 2560 the frame is capped at 1240px, which leaves about 60% blank. It's readable, but thin on 27–32" monitors. | `.frame` | Add a `min-width: 120rem` step: widen the frame to about 1400px for the estimator, counties and reviews grids (not prose), and nudge the type scale up with `clamp()`. Keep prose at a ≤75ch measure. |
| 4.9 | P2 | No print stylesheet. At Letter width the "☰ Menu" button prints, and the estimate total (cream on dark) nearly disappears. | `globals.css` | Add an `@media print` block that hides the nav, toggle, skip link, ticker and CTAs; makes the figure card static; sets `print-color-adjust: exact` on `.verdict__cap`; uses `break-inside: avoid` on cards; and prints link URLs in prose. |
| 4.10 | P2 | Breakpoints are six ad-hoc values (30, 34, 40, 58, 60 and 62rem), with inconsistent collapse points. | `globals.css` | Consolidate to three tokens (40, 58, 62rem), plus the 22rem and 120rem steps above. Re-run the matrix afterwards. |
| 4.11 | P2 | Hover styles aren't wrapped in `@media (hover:hover)`, so they stick after a tap on iOS. | `globals.css` | Wrap them. |
| 4.12 | P3 | No `color-scheme` or `viewport` export, so Samsung Internet's auto-dark may invert the page. | `app/layout.tsx` | Set `export const viewport = { colorScheme:'light', themeColor:'#ffffff' }` and `:root{color-scheme:light}`. |
| 4.13 | P3 | Tidy-up: <br>• Remove the unused `.stack`, `.card__meta`, `.linklist__sub` and `--step-4`. <br>• Replace the 43 inline `style={{}}` with classes. <br>• Consider moving the ~800 estimate-only lines into a CSS module. | `globals.css:179,811,842`, pages | Clean up. |

---

## Phase 5 — Accessibility to WCAG 2.2 AA (P1/P2)

The items in 1.7, 1.8, 2.9, 3.11, 4.2, 4.3 and 4.5 are accessibility work too.
The rest:

| # | Pri | Item | Where | Fix |
|---|---|---|---|---|
| 5.1 | P1 | Text contrast. <br>• `--ink-faint` is 3.89:1 on white and 3.63:1 on band (`.rail__count`). <br>• `--accent` is 4.22:1 on band and 3.94:1 on wash, which fails for small text, including `a:hover` on banded sections. | `globals.css:110,3205` | Use `--accent-deep` for all small text and hover states. Darken `--ink-faint` to at least 4.5:1. |
| 5.2 | P1 | The quote-rotator dots are 2.08:1, and the ticker and file-card timeline loop forever with no pause (WCAG 2.2.2). These are homepage components, but the rule applies site-wide. | `globals.css:1334,1682-1731,1871` | Pause on hover or focus and add a visible pause button, or run each animation once. Darken the dots. |
| 5.3 | P2 | Forced colors (Windows High Contrast): <br>• Every nav link shows an underline. <br>• The `.seg` selected state disappears. <br>• The dots disappear. | `globals.css` | Add `@media (forced-colors: active)` rules. |
| 5.4 | P2 | Star ratings put `aria-label` on a bare `<span>`. | `Reviews.tsx:7`, `AnimatedStars` | Add `role="img"`. |
| 5.5 | P2 | `<main id="main">` has no `tabIndex={-1}`, and the footer lists aren't in a `<nav aria-label="Footer">`. | `app/layout.tsx`, `SiteFooter.tsx` | Add both. |
| 5.6 | P2 | `CountUp` exposes intermediate values to screen readers and flashes from its final value to 0. | `components/CountUp.tsx` | Put `aria-hidden` on the animated text, add a visually-hidden final value, and start on intersection. |
| 5.7 | P1 | There's no automated accessibility check. | CI | Add `@axe-core/playwright` against every route at 375 and 1280, failing on serious or critical issues. Add the `eslint-plugin-jsx-a11y` strict preset. |

---

## Phase 6 — SEO and metadata (P1)

| # | Pri | Item | Where | Fix |
|---|---|---|---|---|
| 6.1 | P1 | **Every page's `og:url` is the homepage** (confirmed in the built HTML), so shared links show the home card. Pages that set their own `openGraph` lose `site_name` and `locale`. | `app/layout.tsx:44`, `title-problems/[slug]/page.tsx:65`, `services/[slug]/page.tsx:41` | Remove `url` from the layout. Add a shared `baseOpenGraph` that each page spreads, with `url` set per page. |
| 6.2 | P1 | The root layout sets `canonical: '/'`, so the 404 page and any future page that forgets its own canonical point at the homepage. The 404 also emits two robots tags. | `app/layout.tsx:39` | Move the canonical into `app/page.tsx`. Add a test that every route sets its own canonical. |
| 6.3 | P1 | **Draft titles can leak through OG images.** The OG routes don't check `isPublishable` and don't set `dynamicParams = false`. | `title-problems/[slug]/opengraph-image.tsx:13-19`, services OG | Add `if (!doc \|\| !isPublishable(doc)) notFound()` and `export const dynamicParams = false`. |
| 6.4 | P1 | The JSON-LD `opens: "9:00 AM"` is invalid; schema.org expects `"09:00"`. | `components/Schema.tsx:127-128` | Add 24-hour fields to `site.hours`. |
| 6.5 | P1 | The 404 page has no title (it shows the site default), and its phone number isn't a link. | `app/not-found.tsx` | Set `title: 'Page not found'` and make the number a `tel:` link. |
| 6.6 | P2 | Titles run up to 106 characters, and descriptions up to about 390 (county pages ~327, partners 282, seller 267, counties 260, buyer 251, services 240, about 230). | per page | Keep titles to about 60 characters with `title.absolute` or shorter SEO titles. Run every description through `metaDescription()` (≤155). Add a test that enforces both. |
| 6.7 | P2 | The sitemap sets `lastModified: now` on static, county, city and team pages, so every build re-stamps them. | `app/sitemap.ts:21` | Use real content dates, or omit `lastModified`. |
| 6.8 | P2 | Article JSON-LD has no `image`. The OG alt text is generic. `/team/gedaliah` and `/team/shevy` are thin pages with no bio. | `title-problems/[slug]`, `team/[slug]` | Pass the OG image URL. Use `generateImageMetadata` for per-page alt text. Noindex the thin team pages until bios exist. |
| 6.9 | P2 | Internal linking. <br>• /counties is titled "by county and city" but links no cities. <br>• The buyer and seller pages aren't linked from the county pages, /estimate or /quote, or from each other. <br>• There's no `/closing-costs` index (it's a 404). <br>• About's team cards don't link to `/team/[slug]`. | several | Add the links, add a `/closing-costs` index page, and add a cities list on /counties. |
| 6.10 | P3 | Smaller items: <br>• `robots.ts` emits a non-standard `host:`. <br>• `llms.txt` omits /order and /privacy. <br>• `/favicon.ico` 302s to the SVG. <br>• `@type` includes the redundant LocalBusiness. | | Tidy up. Add `app/favicon.ico`. |

---

## Phase 7 — Content and copy, page by page (P1/P2)

The firm or a licensed reviewer must sign these off, per the project's
[VERIFY] rule. None of them is filled in from general knowledge.

- **Title-problem pages**
  - **P1:** FAQ answers are flattened to one plain paragraph, which loses
    lists, paragraph breaks and statute links (`lib/faq.ts:23-42`,
    `components/Faq.tsx:282`). Render each answer's HTML, and keep the plain
    text for JSON-LD only.
  - **P1:** `review_tags` don't match the database vocabulary. Pages use
    `clearing-title` and `ron`; the database has `title-clearing` and
    `remote-closing`. As a result four pages show no review. Align the tags
    and add a test.
  - **P2:** the byline role says "Founder", while `lib/team.ts` says "Founder
    and Agent in Charge".
  - **P2:** British spellings ("neighbouring", "authorisation").
- **/title-problems index**
  - **P1:** it says pages are "re-reviewed every six months", but the cycle is
    12.
  - **P1:** it promises a verdict card and a "what happens" band on every
    page, but only 1 of 7 has them. Either describe what every page has, or
    add them to the rest.
  - **P2:** the routes card sends "access" to the wrong cluster.
  - **P2:** the "lawsuits" sub-label points at a draft page.
  - **P2:** dates are formatted without `timeZone`.
- **/services**
  - **P1:** "A closer comes to the signer" contradicts the signings page ("we
    send a notary").
  - **P1:** D4, the 1031 wording.
  - **P2:** "none of which asks you for anything" is false for the quote form.
- **/about**
  - **P1:** D3, the "excellent" wording.
  - **P2:** "week one… not week six" is an implied comparison.
  - **P2:** "most of what is written online is an advertisement…".
  - **P2:** "Our busiest counties" is a volume claim.
- **/partners**
  - **P1:** D3 and D4.
  - **P2:** the "reviews mostly by agents and loan officers" claim doesn't hold
    unless the list is filtered to `industry-professional`.
  - **P2:** that paragraph renders even when no reviews load.
  - **P3:** "CPL" and "closing protection letter" are listed as two items.
  - **P3:** "the single most useful thing" is a superlative.
- **/counties and /counties/[slug]**
  - **P1:** "We e-record in this county" is drawn from a field that records
    whether the *county* supports e-recording.
  - **P1:** the index says "the clerk's fee", but the county pages say
    recording is statutory.
  - **P2:** "Every county has a page" is false in a build without Supabase.
  - **P2:** ~~the "who pays" source names and links competitor title firms and a
    2021 chart; the firm should decide.~~ Decided 24 September 2026: a page
    names only a government office, an underwriter or the team.
  - **P2:** check dates are printed raw ("2026-09-14").
  - **P2:** a null source URL leaves an `href`-less anchor.
  - **P2:** quote marks are doubled inside blockquotes.
  - **P2:** hard-coded rates should come from `statutory-rates`.
- **/cities/[slug]**
  - **P1:** "we order a municipal lien search on every file" needs confirming.
  - **P2:** check dates are printed raw.
  - **P2:** the withheld-facts banner says "this county".
- **/closing-costs/buyer and /closing-costs/seller**
  - **P2:** the withheld-facts banner says "for this county" on statewide
    pages (`components/Prose.tsx:125`); pass a scope label.
  - **P2:** the seller page implies reissue depends on who pays for the
    policy.
- **/reviews**
  - **P1:** the page says "92 reviews… nothing filtered" but lists 85. Add "85
    of 92 have written text".
  - **P2:** the empty state says reviews load from Google; they're seeded into
    Supabase.
  - **P2:** the note about undated reviews has the wrong source ("12 weeks
    ago" labels, not "a year ago").
- **/quote**
  - **P1:** "usually the same business day" needs confirming.
  - **P2:** "Neither tool prices the part that is ours" is contradicted by the
    upload option.
- **/contact**
  - **P3:** add a directions / Google profile link. Everything else is solid.
- **/privacy**
  - **P1:** the page needs to say what it actually covers. It should:
    - list the /estimate contract uploads;
    - scope "only name, email and address are required" to the order form;
    - reconcile retention with 3.9;
    - reword "we do not store your IP" (Vercel logs it).
  - Counsel review remains with counsel.
- **Practice claims across the site (P1)**
  - These are stated as fact and must be confirmed by the firm or softened:
    - "search ordered the same day";
    - "read by a person, day one";
    - "open the file today";
    - "file number the same business day";
    - "confirmed by voice".
  - The full list, with lines, is in the content audit.
- **Docs (P2)**
  - `docs/HANDOFF.md` is stale: it lists 2 published pages and the old hours.

---

## Phase 8 — Tooling and dependencies (P1/P2)

`npm outdated` and `npm audit`, run on 22 September 2026:

| Package | Now | Target | Notes |
|---|---|---|---|
| next | 16.3.4 | **16.3.6** | Patch. Upgrade before launch. Also replace `next/image` `priority` with `preload` (`SiteHeader.tsx:44`), which is deprecated in 16. |
| eslint-config-next | 16.3.5 | 16.3.6 | Patch. |
| zod | 4.6.1 | 4.6.5 | Patch. |
| @supabase/supabase-js | 2.116.0 | 2.117.0 | Minor. |
| @types/node | 22.20.2 | 22.20.4 | Stay on 22.x to match `.nvmrc` and `engines`. |
| **vitest** | 3.2.7 | **5.0.1** | **2 moderate advisories** (GHSA-82fw-gwwq-j7x9, path traversal in `@vitest/mocker`). Dev-only, but it has to reach a clean audit. It's a major upgrade: migrate both configs and re-run the 230 tests. |
| eslint | 9.39.5 | 10.x | Major. Wait until `eslint-config-next` supports 10. |
| typescript | 5.9.3 | 7.x | Major (the native compiler). Try it on a branch. Enable `noUncheckedIndexedAccess`, which would have caught 0.4. |

Also:
- Remove the dead `overrides` entry for `@sveltejs/vite-plugin-svelte`.
- Drop the unused Caslon italic and 700 weights. Four fonts (91KB) are
  preloaded on every page.
- Add DM Sans italic, or remove the italics that are currently faked.

---

## Phase 9 — Testing and QA (P1)

This is how "works perfectly on every screen" gets proved, and then kept.

1. **Playwright end-to-end tests in CI**, against `next build && next start`,
   using the preinstalled Chromium plus WebKit, with a Firefox smoke run.
   - Walk every route in the sitemap at the 14 widths. Fail on horizontal
     overflow, console errors, 4xx/5xx sub-requests, more than one h1,
     skipped heading levels, missing alt text, or a tap target under 24px.
     The script used for this audit is the starting point.
   - Flows:
     - open and close the menu with Escape and with a link;
     - estimator numbers mode, with table-driven totals;
     - address mode, with the routes mocked, covering the race and every
       error state;
     - order, quote and contact, covering success, 422, 429, 500, a timeout
       and a double submit;
     - upload, covering too large, the wrong type, mixed batches and a
       partial failure.
2. **Visual regression tests.** Take Playwright screenshots of every page
   template at 320, 390, 768, 1280 and 2560, with a small diff tolerance.
   Review any change in the PR.
3. **axe-core** on every route (5.7).
4. **Lighthouse CI** on /estimate, a county page, a library page and /order,
   with budgets: Performance ≥ 90 on mobile, Accessibility 100, SEO 100, and
   CLS < 0.05.
5. **Route-handler tests** for all six API routes, with Supabase mocked, so
   that the insert payload is checked against the real constraints. That
   would have caught 0.1.
6. **Fixed-number calculator fixtures** (1.12), and a review-tag vocabulary
   test (Phase 7).
7. **Real-device pass before launch:**
   - iPhone SE (375), a current iPhone (393) and an iPad in Safari;
   - a Pixel and a Galaxy Fold folded (280) in Chrome;
   - Samsung Internet;
   - desktop Chrome, Firefox, Safari and Edge at 1280, 1440 and 2560;
   - VoiceOver on iOS and macOS, TalkBack, and NVDA on Windows;
   - Windows High Contrast mode;
   - landscape phones;
   - 200% browser zoom and 400% reflow.
8. **Live checks on a schedule.** Keep `check:rolls` running weekly in CI, with
   the proxy variable set. It is the only thing that notices when a county
   changes its roll service.

---

## Phase 10 — Operations and cutover (P0 on the day)

On top of `docs/go-live-status.md` (DNS with the Microsoft 365 MX/SPF records
preserved, domain attached, env vars, Search Console):

1. **Production and build env vars.** Set `SUPABASE_URL` in the *build*
   environment too, because the CSP and the county list are computed at build
   time. Set `RESEND_API_KEY` and `NOTIFY_FROM_EMAIL`, and confirm the Resend
   domain's SPF and DKIM.
2. **A health endpoint** reporting Supabase, Resend and the storage bucket, with
   an uptime monitor on it and on `/`, `/estimate` and `/api/property-search`.
3. **Error monitoring** (Sentry or Vercel's). Alert on any 5xx from `/api/*`.
4. **Vercel WAF rate limits** on `/api/*`, replacing the in-memory limiters,
   plus BotID or Turnstile (3.2).
5. **A test submission of every form in production** on launch day, checking
   that the database row, the office email and the upload link all arrive.
   Then delete the rows.
6. **Confirm HSTS `includeSubDomains; preload`** doesn't strand an HTTP-only
   subdomain before submitting to the preload list. Add a `Permissions-Policy`
   header.
7. **Backups.** Confirm Supabase PITR/backups on the website project.
   Schema-as-migrations (3.7) makes the project rebuildable.

---

## Order of work

| Step | Scope | Rough size |
|---|---|---|
| 1 | Phase 0 code items (0.1–0.6, 0.8) plus the Next/zod/supabase patch upgrades | 1–2 days |
| 2 | Send D1–D6 and the Phase 7 practice claims to the firm, underwriter and counsel **now**. They run in parallel with everything below. | — |
| 3 | Phase 9 harness first (Playwright matrix, axe, route-handler tests), so every later fix is proved | 2–3 days |
| 4 | Phase 3 (forms and security) and Phase 2.1–2.6 (lookup correctness) | 4–5 days |
| 5 | Phase 1 (estimator) and Phase 4.1–4.4 plus Phase 5.1–5.2 (layout and accessibility P1s) | 3–4 days |
| 6 | Phase 6 (SEO) and the Phase 7 copy fixes once the answers are back | 2 days |
| 7 | Remaining P2s, the vitest 5 migration, then the real-device pass | 3–4 days |
| 8 | Phase 10 cutover | 1 day |

**Definition of done:**
- Every P0 and P1 is closed.
- The Playwright matrix, axe, Lighthouse budgets and visual snapshots are green
  in CI.
- `npm audit` is clean.
- The real-device pass is signed off.
- Every D-item and practice claim is answered in writing and reflected in the
  copy.
- One real submission of each form has been received by the office in
  production.
