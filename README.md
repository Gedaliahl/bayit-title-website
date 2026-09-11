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
npm run typecheck   # tsc --noEmit
npm run build       # production build; drafts excluded
SHOW_DRAFTS=1 npm run build   # preview build; drafts included
```

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

## Known blockers

Carried forward from `docs/HANDOFF.md`, still open:

- `rate_tables` is empty → no calculators, and county pages withhold fee figures
- Every `[VERIFY]` flag has now been drafted in (see `docs/verify-worklist.md`),
  but 41 of the 62 answers are unconfirmed — 10 need First American, 31 are our
  own timelines, costs and practice. They are tracked per page in a
  `pending_confirmation` front-matter list, which the build enforces the same
  way it enforces `[VERIFY]`. Review pack: `docs/review/verify-fill-review.pdf`
- Which team members hold Florida *online* notary registrations is still open,
  and is the one flag that must come from the commission record
- Team bios need 2–3 sentences each from Gedaliah, Jennifer and Chaya; the About
  page's founding story is Shevy's to write
- No usable photography
- Google Business Profile API access was rejected; reapply from a bayittitle.com
  address. Reviews are seeded manually and work fine — the sync is an
  optimisation, not a blocker.
- Legacy Wix URLs in `next.config.mjs` are a first pass; complete them from Wix
  analytics

## Docs

- `docs/HANDOFF.md` — project background and current state
- `docs/claude-project-brief.md` — drafting brief, source list, workflow
