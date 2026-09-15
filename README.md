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

`.github/workflows/ci.yml` runs all five on every pull request.

The tests in `tests/` cover the decisions rather than the plumbing: the
reviewed/VERIFY gate, the two review suppression rules, the document allowlist
that has to mirror the bucket, and the IP fingerprint. Each of those is a choice
about what the firm publishes or stores, and each could be weakened by a
refactor without a single build turning red.

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

`robots.txt` already points at `sitemap.xml`, so submission is the only step
left once a property exists.

## Structured data

`components/Schema.tsx` emits Organization, Person, Article, FAQPage and
Breadcrumb JSON-LD. The point is entity resolution: confirming that this site,
the DFS licence record, the Google Business Profile and the LinkedIn page are one
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
- `rate_tables` is empty and nothing is waiting on it. The promulgated premium
  is in `lib/promulgated-premium.ts` from OIR rule 69O-186.003, and transfer
  taxes and recording charges in `lib/statutory-rates.ts` from the statutes that
  set them; `/calculator` and the county pages read those and cite every line.
  What is still unpriced anywhere on the site is our own fee, the search and
  examination, and endorsements — the calculator lists them as not counted
- Several pages make First American coverage statements that are unverified
- Timeline data is a `[VERIFY]` flag on every library page
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
