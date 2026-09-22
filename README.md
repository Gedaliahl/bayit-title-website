# bayittitle.com

The public marketing and content site for Bayit Title LLC, a Florida title
insurance agency in Coral Springs.

**This repository is not connected to the Bayit title production system.** That
is a separate Supabase project (`Bayit`, ref `rsdhvyutynygzgtzzljd`) holding live
transactions, escrow and banking data. The separation is deliberate and is
enforced in code — `lib/supabase.ts` throws at client construction if
`SUPABASE_URL` points at it.

## Stack

- Next.js 16 (App Router) + React 19, deployed on Vercel
- Supabase for data (website project, ref `ajauxndpqllrsfivvurj`)
- Content is Markdown with front-matter in Git, rendered statically at build time

The split matters: written content lives in `content/` — versioned, diffable,
reviewable in a pull request. Data lives in Supabase (reviews, leads, orders,
rate tables, locations). Supabase is never on the critical rendering path; if it
is unreachable, pages still build and render without reviews.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

Without Supabase credentials the site builds and runs. Reviews and county detail
fall back to empty or to the canonical values in `lib/site.ts`; the form
endpoints return a 500 with an instruction to phone or email instead.

```bash
npm run lint        # eslint, flat config
npm run typecheck   # tsc --noEmit
npm test            # vitest
npm run build       # production build; drafts excluded
SHOW_DRAFTS=1 npm run build   # preview build; drafts included
```

`.github/workflows/ci.yml` runs all five on every pull request, and then the
browser suite and Lighthouse described below.

The tests in `tests/` cover the decisions rather than the plumbing: the
reviewed/VERIFY gate, the two review suppression rules, the document allowlist
that has to mirror the bucket, and the IP fingerprint. Each of those is a choice
about what the firm publishes or stores, and each could be weakened by a
refactor without a single build turning red.

### In a browser

```bash
npm run test:e2e    # Playwright: builds, starts on :3206, runs e2e/
npm run test:a11y   # the axe sweep on its own
npm run build && npm run lhci   # Lighthouse CI on four templates, as a phone
```

`e2e/` holds three suites, all run against `next build && next start`:

- `matrix.spec.ts` walks every URL in `/sitemap.xml` except the homepage, the
  two `?mode=` estimator views, an address that was never a page and a draft
  (both must answer 404), at 14 widths from 280 to 2560. It fails on
  horizontal overflow, console or page errors, a failed same-origin request,
  anything other than one `h1`, a skipped heading level, an `img` without
  `alt`, and a target under 24px that WCAG 2.5.8 does not excuse.
- `a11y.spec.ts` runs axe (WCAG 2.0, 2.1 and 2.2, A and AA) on the same routes
  at 375 and 1280, and fails on anything serious or critical.
- `flows.spec.ts` covers the phone menu, both figure modes of the estimator,
  the three forms and both upload boxes. The API routes are answered with
  `page.route`, so no test reaches Supabase or a county roll, and the
  estimator's expected totals come from `lib/closing-estimate.ts` itself.

Locally only Chromium runs. CI adds WebKit on a phone and a Firefox smoke run;
`E2E_ALL_BROWSERS=1` does the same on a machine that has them installed. An
already-running `next start` on :3206 is reused rather than rebuilt, and
`E2E_PORT` moves it.

There are no screenshot comparisons. Fonts are rasterized differently on each
CI runner image and on each developer's machine, so a pixel diff either fails
on nothing or is loosened until it passes on everything. The matrix checks the
layout properties that can be stated — nothing wider than the screen, nothing
too small to tap — and a person looks at the pages.

`lighthouserc.json` fails on accessibility below 100 or SEO below 95, and warns
on performance below 90 or best practices below 95. SEO is scored without the
`is-crawlable` audit, because every build that is not the production
deployment answers `noindex` on purpose (see "Which deployment search engines
are allowed into"). `@lhci/cli` is run through `npx` rather than installed:
its dependency tree carries advisories with no fixed release, and this repo
keeps `npm audit` at zero.

`.github/workflows/rolls.yml` runs `npm run check:rolls` every Monday.

## The one rule that matters most

This is a licensed title agency's website. A wrong statute, a wrong coverage
claim or an invented timeline is a professional problem, not a content error.

Where a fact is not confirmed, the draft says `[VERIFY: what's needed]` and the
rendered page shows it. **Do not fill a VERIFY flag in from general knowledge.**
That is the specific failure this project is built to prevent. A draft with
honest gaps is useful; a draft with confident fabrications is a liability.

### How the build enforces it

Every content file declares `status: draft` or `status: reviewed`.

| | `draft` | `reviewed` |
|---|---|---|
| Route generated in production | no | yes |
| Route generated with `SHOW_DRAFTS=1` or on a Vercel preview | yes, `noindex` | yes |
| Listed in `sitemap.xml` and `/llms.txt` | never | yes |
| Byline and `Article` JSON-LD | none | rendered |

A file with `status: reviewed` that still contains a `[VERIFY]` flag **fails the
build**. Resolving those flags is what the review is. Setting `status: reviewed`
also requires `author`, `reviewed_on` and `next_review`, because the byline is a
named licensed agent standing behind the page.

So: an unreviewed page cannot reach the public site, and a page cannot claim a
licensed review it has not had.

## Counties, cities and cost pages

County pages are generated from the `locations` table (`supabase/seed/`), one
per row of `kind = 'county'`, and every one of the 67 counties has a row. The
six priority counties get a card on the home page; the next six by volume get
a card on `/counties`; the rest are linked from the full list there. A county
page states only what the repository can cite: the promulgated premium, the
statutory taxes and recording charges, the recording office, and the office's
own words on turnaround. Local custom on who pays for the owner's policy is
printed only where `customary_owner_policy_payer` has been set by the team.

City pages (`/cities/[slug]`) come from `lib/florida-cities.ts`. A city owns one
fact — which county it is in — and renders that county's figures. A city whose
county has no row does not render, so seed the county first.

`/closing-costs/buyer` and `/closing-costs/seller` are built from the same rate
libraries. What no rule sets (our fees, the contract's default allocations) is
named on the page as withheld rather than numbered.

## Content

```
content/
├── title-problems/   the library — one specific title problem per page
└── services/
```

Front-matter (see `lib/content.ts` for the authoritative schema):

```yaml
status: draft            # draft | reviewed
title: "<the question in the reader's words>"
slug: "<kebab-case, must match the filename>"
cluster: "liens"         # see CLUSTERS in lib/content.ts
direct_answer: "..."     # 40–60 words, complete and quotable standing alone
counties: ["broward-county"]
review_tags: ["permits"] # pulls a matching Google review onto the page
related: ["slug-a"]
quick_facts:
  - term: "Who this affects"
    detail: "..."
verdict:                 # optional — the card beside the H1
  headline: "Rarely — if it is found early."
  short: "Rarely"        # the index card's "STOPS THE CLOSING? …" label
  rows:                  # [ term, detail ] pairs, in the order they read
    - [ "Who resolves it", "The seller, from proceeds" ]
    - [ "Timeline", "3–10 business days for a written payoff" ]
steps:                   # optional — the cream band under the hero
  - title: "The search returns it"
    body: "A hit in the county's official records, matched on the seller's name."
read_time: 7             # optional — omitted rather than estimated
author: "shevy"          # required when status: reviewed
reviewed_on: 2026-09-10  # required when status: reviewed
next_review: 2027-09-10  # required when status: reviewed
```

Body order: H1 → direct answer (rendered from front-matter) → quick facts → H2
sections phrased as questions → "How Bayit Title handles this" → when to involve
an attorney → FAQ → related → byline → one quiet CTA. 600–1,800 words. Never pad.

The FAQ is parsed out of the Markdown for `FAQPage` JSON-LD, so it stays in sync
with what the page actually says. An answer containing a `[VERIFY]` flag is
excluded from the structured data.

`verdict` and `steps` are both optional, and `verdict.headline` is optional
inside `verdict`: a page can carry its index label before anyone has written and
checked the sentence that goes above the fold. Where they are absent the card and
the band are simply not rendered. Rows without a headline are a build error —
a capless card is worse than none. A `[VERIFY]` flag written into either is
counted and shown exactly as one in the body is, and a Markdown link in a
`quick_facts` or `verdict` detail is rendered, so a statute citation there is a
link rather than raw `[text](url)`.

### The interior page system

Everything below the home page is assembled from one set of parts, in
`app/globals.css` and `components/`:

```
<SiteHeader>
<section .page-hero>      headline and lede | <Verdict> card — the answer, first
<StepBand>                cream band: what happens, in order
<div .cols>               <Rail> (sticky contents) | .detail
<QuietCta variant="band">
<SiteFooter>
```

The premise is that the reader's first question — does this stop my closing,
what does a title agency actually do, does the county change the price — is
answered in the card beside the headline before the page explains anything.
That card is server-rendered into the first HTML, because it is the block a
search snippet and an assistant both quote.

`lib/content.ts` splits a body at its `## ` headings so the template can lay each
one out: the questions become a `<details>` list, "How Bayit Title handles this"
becomes a callout on its own ground, and the rail links to the rest by heading id.
Both are derived from the heading text rather than from a markup convention, so
an author writes the same Markdown they always did.

## Voice

Full rules in `docs/claude-project-brief.md`. The short version: answer first,
"we" not "I", calm about risk, specific rather than superlative, headings phrased
as the reader's question.

**No superlatives or comparisons.** Florida regulates title agency advertising.
Never best, fastest, #1, "unlike other title companies". Authority comes from
specificity, never assertion.

No client-identifying detail, ever. Never imply 24/7 or standing after-hours
availability — reviews may describe it, the firm must not promise it.

Banned: seamless, stress-free, concierge (as a tier), trusted, hassle-free, peace
of mind, dream home, hero, rescue.

## Accessibility

Audited with axe-core (WCAG 2.0/2.1/2.2 A and AA, plus best practice) across
every page type at 375px and 1280px, and by hand for the things a scanner
cannot see. Current state: **no axe violations, no horizontal overflow at any
width down to 320px, every focusable element carries a visible focus ring, and
the text-spacing override of SC 1.4.12 clips nothing.**

Two findings, both fixed:

- `.nav a` outranked `.btn--primary` on specificity, which repainted the
  header's "Open an order" button ink-on-oxblood — a contrast ratio of **1.46:1**
  on the primary call to action, on every page. The container link rules now
  exclude `.btn`.
- A failed submit was silent on a phone. The button sits at the bottom of a long
  form and the errors render above the fold, so four errors rendered with none
  on screen, while the disabling button dropped focus onto `<body>`.
  `components/useErrorFocus.ts` moves focus to the first rejected field, which
  scrolls it into view, puts the caret where the fix gets typed, and reads the
  label and error together.

Undersized tap targets were checked against SC 2.5.8 properly rather than by
size alone: every one is either inline in text or clears the 24px spacing
exception, so none is a failure.

## Security headers

`next.config.mjs` sets HSTS, `nosniff`, a referrer policy, `X-Frame-Options`
and a **Content-Security-Policy**. The policy is static rather than
nonce-based, and that is the one trade worth understanding.

`script-src` carries `'unsafe-inline'` deliberately. Next emits two inline
bootstrap scripts per page, and the JSON-LD this site exists to publish is
inline by definition. Removing it means a per-request nonce, which needs
middleware and opts every page out of static rendering — a real cost on a site
whose whole shape is statically generated content served from the edge.

What the policy still buys, verified in a browser against the exact header the
app serves: an injected `<script src>` pointing at another host is refused, so
is an injected form posting elsewhere, so is a rewritten `<base>`, an `<object>`,
an outside image, an `<iframe>`, and any `fetch` to an origin not named below.
Markdown is rendered with `sanitize: false`, so that backstop is not theoretical.

`connect-src` names the Supabase origin because **the browser uploads order
documents straight to the storage bucket**. The origin is read from
`SUPABASE_URL`, the same variable the server client uses, so the policy cannot
drift from the project the app points at. With that variable unset the build
warns and uploads will be blocked by the browser — loudly, rather than
mysteriously at the worst moment.

`tests/csp.test.ts` asserts the properties rather than the string, because a
weakened CSP breaks nothing and is therefore invisible.

## Measurement

Vercel Web Analytics and Speed Insights, mounted in `components/Analytics.tsx`
and **rendered only when `VERCEL_ENV` is `production`**. Preview deployments are
the team reading its own drafts, which on a site starting from this much traffic
would be most of the data rather than a rounding error.

Both scripts are served from this origin under `/_vercel/`. Nothing calls a
third party and nothing sets a cookie, so the site needs no consent banner to
count a pageview and a future CSP has no outside host to name.

### Which deployment search engines are allowed into

**Only the one serving www.bayittitle.com.** Every other deployment — a preview,
and the production deployment for as long as it answers on a `*.vercel.app`
host — returns `Disallow: /` for everything and a `noindex, nofollow` meta tag,
and names no sitemap.

The reason is the cutover. Until the domain moves, the old site is the one
ranking for these terms, and a fully crawlable second copy of every page is a
duplicate competing with it and splitting the signals between the two.

`lib/seo.ts` derives this from `VERCEL_PROJECT_PRODUCTION_URL`, the host Vercel
serves this project's production deployment on. **Attaching the domain to the
Vercel project is what turns indexing on**, on the next deploy, with nothing to
remember on the day — which is the point of deriving it rather than reading a
flag, since a flag nobody remembers leaves the real site invisible.

### Search Console and Bing

`GOOGLE_SITE_VERIFICATION` and `BING_SITE_VERIFICATION` emit the ownership meta
tags. Neither is a secret — both are published in the page head. They are env
vars so verifying a property is a dashboard change rather than a deploy, and
with neither set no tag is emitted at all rather than an empty one.

**Set them on production only.** A Search Console property is per-origin;
verifying the Vercel preview hostname would report on a site nobody is meant to
find. If you are already in the domain's DNS for the cutover, prefer Google's
DNS TXT method and leave `GOOGLE_SITE_VERIFICATION` unset — it verifies the
whole domain including subdomains. Bing can import an already-verified Search
Console property, which skips its token too.

`robots.txt` points at `sitemap.xml` once the domain is attached (see above), so
submission is the only step left after that.

## Structured data

`components/Schema.tsx` emits Organization, Person, Article, FAQPage and
Breadcrumb JSON-LD. The point is entity resolution: confirming that this site,
the DFS license record, the Google Business Profile and the LinkedIn page are one
entity.

**There is deliberately no `AggregateRating`.** The reviews were collected by
Google, not on-site; marking them up as our own rating risks a manual action.

## Reviews

Fetched from Supabase at build time and failing soft. Two rules are enforced in
`lib/reviews.ts` rather than left to the UI:

- Rows with `date_is_approximate` render with **no date**. Those dates were
  derived from relative labels ("12 weeks ago") and two contradict their own
  owner-reply dates, so printing one would be a guess.
- Rows with `body_truncated` are **withheld entirely** until the full text is
  captured, because a body cut off by Google's "View full review" link would be
  quoted out of context.

## Forms

`/order`, `/quote` and `/contact` post to Route Handlers under `app/api/`.

- Validated with Zod (`lib/schemas.ts`) — the same schema runs in the browser for
  feedback and in the handler as the actual gate.
- Rate-limited per IP fingerprint per hour, counted in the database rather than
  in memory, because serverless instances do not share memory.
- The caller's IP is never stored: `lib/submissions.ts` stores a salted SHA-256
  fingerprint.
- Off-screen honeypot field. A filled honeypot gets a success response and no
  write, so the bot has nothing to learn from.
- The submission is persisted before the notification email is attempted, so a
  mail outage loses a notification, never a lead.

### Order documents

Files never pass through the application. `/api/orders` stores the order, then
mints one short-lived signed upload URL per declared document; the browser PUTs
the bytes straight to the private `order-documents` bucket and calls
`/api/orders/documents` to confirm.

That shape is partly a platform limit — a serverless function body caps out
around 4.5 MB and a survey PDF clears that alone — and partly the safer design:
the bucket stays private, the service-role key stays on the server, and the
browser holds permission to write exactly one object at exactly one path.

- **The order is saved and notified before any file moves.** A closed tab costs
  the office an attachment, never an order. Documents arrive in their own
  notification, with signed links that expire in a week.
- **A row is written only once the object is seen in the bucket.** An upload
  ticket is permission, not evidence, so `order_documents` never lists a
  document nobody sent. That also makes confirmation safe to expose: holding an
  order id is not enough, because registering a document requires having
  uploaded it first.
- **Storage paths are generated, never derived from the filename.** The sender's
  name is a label in `original_name`; size and type are read back off the stored
  object.
- The accepted types in `lib/documents.ts` mirror `allowed_mime_types` on the
  bucket, and the size cap mirrors its `file_size_limit`. The bucket is the real
  gate — adding a type in code alone buys a picker that accepts a file and an
  upload that fails.
- Documents carry a `purge_after` date marking when they become eligible for
  deletion. **Nothing acts on it.** There is no purge job and no retention
  policy — how long the agency must keep a contract or a payoff letter is a
  decision for the firm and its counsel, not a schema default. Neither the form
  nor the notification claims anything about deletion, and neither should until
  that decision is made.

## Estimating from an address

`/estimate` starts from a property address instead of a price. Typing one opens
a dropdown of real properties; picking one sets the county, fills in the
assessed value, and prices the premium, the transfer taxes and the recording
against it.

`lib/county-rolls.ts` is the registry: one entry per county, naming the service
and the columns. It covers 20 of Florida's 67 counties, and with
Orange and Duval — which have their own request shapes, below — 22 counties fill
a figure in, the six this office works in most among them. A county is in the
registry only if half the addresses sampled from it produce a figure; four that
were tried and did not are named in the file. `lib/property-lookup.ts` is the machinery that turns an entry
into a query, and knows nothing about any particular county. Adding a county is
adding an entry.

### Where a figure comes from

Every entry declares one of four `figures` modes, in descending order of how
directly the county answers:

- **`row`** — the county's layer carries the address and the values together, so
  a suggestion arrives priced. Broward, Palm Beach, Miami-Dade, Hillsborough and
  Lee.
- **`point`** — the layer is address points. The search asks for the point, and
  the figures are read off the Department of Revenue's statewide parcel roll at
  it. An address point stands on the property; the Census geocoder's
  interpolated point does not, which is the whole reason this distinction
  exists.
- **`centroid`** — a parcel layer whose service will hand back a centroid with
  the search. A parcel's centroid is inside the parcel.
- **`feature`** — the same, for services too old to return a centroid: the
  geometry of the one row somebody picked is fetched when they pick it.

Orange and Duval are neither: Orange searches the property appraiser's address
points, Duval the city's address locator, and both resolve through the same
statewide roll. They are in `lib/property-lookup.ts` rather than the registry
because each needs its own request shape.

Everywhere else the dropdown comes from the **U.S. Census Bureau geocoder** —
free, keyless, statewide; it names the county the address falls in, which beats
the place-name guess in `lib/florida-places.ts`, and knows nothing about value.

### The statewide geocoder, and the last forty-five counties

Set `ARCGIS_API_KEY` and every Florida address can be searched and priced,
including in counties that publish nothing of their own. `lib/geocoder.ts` asks
Esri's World Geocoding Service for the address and the Department of Revenue's
roll for the figure at the point it comes back with. Without the key the file
does nothing and the page says so — twenty-two counties rather than all of them.

The key is why it works and the key is not the interesting part. **`Addr_type`
is.** Esri says which kind of answer it is giving: `PointAddress` and
`Subaddress` mean it has the building, `StreetAddress` and `StreetName` mean it
is interpolating along a block the way the Census geocoder does. Only the first
kind is allowed to produce a figure, so the difference between a geocoder that
knows an address and one that is guessing is a field to read rather than a
judgement to make. Measured on real addresses in counties with no roll of their
own: about half geocode to a rooftop, and those price at around 80%, with the
rest declining — a point on a driveway, or a parcel the state roll has not
caught up with.

Two terms of the cheaper geocode are kept by the code rather than by whoever
holds the key: suggestions are free and the geocode that follows one is billed,
so typing goes to `/suggest` and only a picked address is geocoded; and the
geocode is requested `forStorage=false`, so that response is never cached and
nothing from it is written down. The address itself is still not kept — see
below.

### A parcel found by location has to prove it is the right parcel

Before any figure fetched by point or centroid is shown, the address on the
Department of Revenue's row has to agree with the address that was picked
(`addressesAgree`), or the parcel numbers have to (`parcelIdsAgree`, which knows
that Orange writes township-range-section where the state writes
section-township-range). A unit on one side and not the other is the same front
door; two extra words is a different street.

A point landing on a right-of-way strip, a condominium's parent parcel or the
lot next door satisfies neither, and the reader gets an empty box and the
appraiser's link instead of a plausible wrong number. It declines for real
reasons too: a new subdivision exists in a county's own layer a year before the
state roll has the lots, and corner lots are filed under one street by the
county and the other by the state — 1409 E Esther Street in Orlando is 1919 Pine
Bluff Ave on the state roll, which the page says under the figure.

### Adding a county

1. Find a layer: ArcGIS Online and the ArcGIS Hub API, searched for
   `<county> County parcels` and `<county> County address points`, plus the
   county's own ArcGIS Server where it runs one. Region 2 of the Division of
   Emergency Management — eleven counties in the Big Bend — is one service
   hosted by Leon County, one layer per county.
2. Prove it. The layer has to sit inside the county it claims (a title search
   for "Citrus County parcels" cheerfully returns a Palm Beach layer), an
   address search of the shape this code builds has to return rows, and most of
   those rows have to produce a figure.
3. Add the entry and run `npm run check:rolls`, which is step 2 as a test:
   `tests/rolls.live.test.ts` puts every entry through the real query path and
   fails the county that stops answering. It is excluded from `npm test`
   because it talks to sixty other offices' servers.

### What is not queried per keystroke

Sixty registry entries cannot all be asked at once. The counties this office
works in are asked outright, alongside the Census geocoder; the geocoder names
the county an address is in, and a county outside that set has its own source
asked on the strength of that, one hop later.

### Why the statewide roll is only ever asked about a point

The Department of Revenue's layer covers all 67 counties, and attribute queries
against its 10.8 million rows time out at around 55 seconds — `PARCEL_ID` is the
one indexed column on it. Asked which parcel covers a coordinate, in its own
projection, it answers in well under a second. It is stored in EPSG:3086 and
reprojects a latitude and longitude slowly enough to matter — 44 seconds against
0.4 on a cold cache — so `lib/florida-albers.ts` projects the point first.

Rejected: a commercial aggregator of *values*, which would cover the state but
leave no figure on the page able to name the office it came from. Buying
addresses is a different trade — the geocoder is asked where a building is, and
every figure still comes off a published roll. Also rejected: a ring of probes
around a Census-geocoded address, because that geocoder interpolates along a
block and can be 200 metres out, not 20.

### The address is not kept

`/api/property-search` and `/api/parcel-value` write nothing, notify nobody and
set no cookie. With a key configured the address is also sent to Esri, which the
privacy policy says in its own words. Both are POSTs so the address stays out of request logs, and
their rate limits are counted in process rather than in the database — the
opposite of the form endpoints, because the first of them fires while somebody
types. The privacy policy says all of this in its own words.

### The county changes the tax, never the premium

The promulgated schedule is statewide. What moves with the county is documentary
stamp tax on the deed — 60¢ per $100 in Miami-Dade against 70¢ elsewhere, plus
that county's 45¢ surtax on anything that is not a single-family residence.
Those taxes are charged on the *consideration*, and a page that starts from an
address has no consideration in it, so `lib/assessed-estimate.ts` computes them
on the valuation figure, says so on every line that does it, and keeps them out
of the premium subtotal.

## The Wix cutover

`bayittitle.com` runs on Wix today. Every source in the redirect map in
`next.config.mjs` was checked against the live site rather than guessed at; the
list it replaced was a first pass at Wix naming conventions, and seven of its
nine entries redirected paths that had never existed while six real pages had no
redirect and would have 404ed. `tests/redirects.test.ts` pins the map, because a
dropped entry is invisible until the traffic is already gone.

**The canonical host is www.** The Wix site 301s the apex to `www`, so every
indexed URL and inbound link already points there; moving to the apex would put
a redirect hop in front of the whole existing index for nothing. **Vercel must
have `www.bayittitle.com` set as the primary domain**, with the apex attached
and redirecting to it — that is where the host redirect belongs, not duplicated
in `next.config.mjs`.

Next serves `permanent: true` as a 308 rather than a 301. Google treats the two
the same for passing ranking signal.

Two things are still open:

- The privacy policy is live but has not been through a lawyer; the GLBA
  question and a definite retention schedule are still open
- The Wix sitemap lists what Wix *publishes*, which is a floor rather than a
  ceiling — a URL deleted years ago can still sit in Google's index with links
  pointing at it. Re-check the map against Search Console's Pages report on the
  Wix property before the cutover. The Pennsylvania entries are exactly that
  case: they 404 on Wix already and are kept because the firm is Florida-only
  and a stale page must neither resurface nor land on a 404.

## The privacy policy

`app/privacy/page.tsx`, live, linked in the footer and next to both forms, and
listed in the sitemap.

Two policies ran on the Wix site — `/privacy`, effective 17 April 2026, and
`/privacy-policy`, last updated 15 March 2026 — saying overlapping things in
different words. Every substantive commitment in both is carried over into this
one page and the duplicate path redirects, so there is no longer a pair of
documents free to drift apart. `tests/privacy.test.ts` asserts the commitments
survived, because a privacy policy is a set of promises rather than copy: a
dropped line about not selling personal information is invisible on the page and
consequential everywhere else.

**The SMS section is compliance text, not copy.** Carriers require terms of that
shape to be publicly posted for an A2P messaging registration, and the old page
was cited as both the privacy policy and the SMS terms of service. Check with
whoever manages that registration before changing its wording. Note also that
**no form on this site collects SMS consent** — there is no checkbox — so if the
registration relies on web-form opt-in, that mechanism does not exist here yet.

Everything describing the website is written from the code and is checkable: the
fields each form posts, the salted fingerprint that replaces the caller's IP, and
the absence of any cookie or browser storage, which was verified in a browser
with analytics active. Two of those are pinned by tests, because the page now
makes claims the code has to keep true.

**It has not been through a lawyer**, and two things deserve counsel's eye:

1. Whether the agency needs a separate Gramm-Leach-Bliley notice for the closing
   side. A title agency is a financial institution under GLBA, and this page is
   scoped to the website.
2. Retention. Section 7 describes the practice honestly — kept as long as needed
   and as long as the law requires — because no schedule has ever been set. A
   definite one would be better, and it is the same decision still outstanding
   for uploaded order documents.

## Known blockers

Carried forward from `docs/HANDOFF.md`, still open:

**Waiting on the firm**

- All nine content files are still `status: draft`, so production publishes zero
  library pages. See `docs/verify-worklist.md` — 62 flags, triaged by who can
  answer them.
- Every `[VERIFY]` flag has now been drafted in, but 41 of the 62 answers are
  unconfirmed — 10 need First American, 31 are our own timelines, costs and
  practice. They are tracked per page in a `pending_confirmation` front-matter
  list, which the build enforces the same way it enforces `[VERIFY]`. Review
  pack: `docs/review/verify-fill-review.pdf`
- The verdict cards are only partly filled. Every library page carries a
  `verdict.short` — the label the index card leads with — and each one is in that
  page's `pending_confirmation` list awaiting a reviewer. Only
  `judgment-against-seller-before-closing-florida` has the four card rows and the
  five steps; the other seven render without the card or the band until somebody
  who can answer for the practice writes them. Nothing is guessed to fill a gap.
- Two of the six priority counties have no recording office in the locations
  table, so their cards on `/counties` show a name and no line under it. Palm
  Beach and Miami-Dade need a `clerk_name` read off each office's own site and
  dated, the way `supabase/seed/locations_recording_offices.sql` does the rest.
- Which team members hold Florida *online* notary registrations is still open,
  and is the one flag that must come from the commission record
- `rate_tables` has a seed (`supabase/seed/rate_tables.sql`, statutory figures
  verified 2026-09-14) but no code reads it: the site takes the same figures from
  cited TypeScript instead, so the build does not depend on Supabase. Nothing is
  waiting on the table. The promulgated premium is in
  `lib/promulgated-premium.ts` from OIR rule 69O-186.003, and transfer taxes and
  recording charges in `lib/statutory-rates.ts` from the statutes that set them; `/calculator` and the county pages read those and cite every line.
  What is still unpriced anywhere on the site is our own fee, the search and
  examination, and endorsements — the calculator lists them as not counted
- Several pages make First American coverage statements that are unverified
- Bios for Shevy and Gedaliah; the About page's founding story is Shevy's to
  write. Jennifer's and Chaya's are in.
- No usable photography
- No retention schedule for form submissions, orders or uploaded documents. It
  blocks a definite §7 in the privacy policy and any purge of `purge_after`.
- The privacy policy is live but has not been through a lawyer; the
  Gramm-Leach-Bliley question for the closing side is open.

**Engineering, unblocked**

- The document upload's storage round-trip has never been exercised: minting a
  signed URL, the browser PUT, and the bucket listing on confirm all need a
  service-role key and one real submission.
- No form collects SMS consent, while the privacy policy carries SMS terms for an
  A2P registration. If that registration relies on web-form opt-in, the mechanism
  does not exist here.
- `review_requests` and `ai_audit_log` are schema with no code — the review-ask
  flow and the quarterly AI-visibility audit are both unbuilt.
- Google Business Profile API access was rejected; reapply from a bayittitle.com
  address. Reviews are seeded manually and work fine — the sync is an
  optimisation, not a blocker.

**Launch mechanics, none started**

- Domain cutover, with `www.bayittitle.com` set as the primary domain in Vercel
- `RESEND_API_KEY` unset, so form notifications silently no-op; plus SPF/DKIM for
  the sending domain
- Supabase environment variables confirmed in Vercel before cutover, not after
- Search Console and Bing properties created on the real domain, and the redirect
  map re-checked against Search Console's Pages report for stale indexed URLs

## Docs

- `docs/HANDOFF.md` — project background and current state
- `docs/claude-project-brief.md` — drafting brief, source list, workflow
