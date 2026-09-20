# Bayit Title Website — Handoff to Claude Code

Paste this into Claude Code as your starting context. Everything below is current as of September 2026.

---

## The project in one paragraph

Bayit Title LLC is a Florida title insurance agency in Coral Springs. We are building bayittitle.com to rank on Google for title searches across Florida — with emphasis on Broward, Palm Beach and Miami-Dade — and, just as importantly, to be cited by AI assistants (ChatGPT, Claude, Gemini, Perplexity, Google AI Overviews) as the authoritative source on Florida title questions. The strategy is a deep library of pages answering specific, complicated title problems, each written so a machine can quote it: a 40–60 word direct answer up top, Florida-specific detail, statute citations, and a byline from a named licensed agent. The current site is a thin Wix page and is being replaced entirely.

---

## Stack

- **Next.js 16.3.4** (App Router) + **React 19**, deployed on **Vercel**
- **Supabase** for data. Project `bayit-title-website`, ref `ajauxndpqllrsfivvurj`, region us-east-2
- Content is **Markdown with front-matter in Git**, not in the database
- Zero npm vulnerabilities as of last install

**The split matters:** written content lives in `content/` as Markdown (versioned, diffable, statically generated at build time). Data lives in Supabase (reviews, leads, orders, rate tables, locations). Supabase is never on the critical rendering path.

**Critical:** there is a *second* Supabase project called `Bayit` which is the live title production system — transactions, escrow, banking details. The website must never connect to it. That separation was deliberate.

---

## Repo state

```
bayit-website/
├── app/
│   ├── layout.tsx              header, footer, fonts, Organization schema
│   ├── globals.css             design tokens
│   ├── page.tsx                homepage
│   ├── robots.ts               AI crawlers explicitly allowed
│   ├── sitemap.ts
│   ├── reviews/page.tsx
│   ├── title-problems/
│   │   ├── page.tsx            index, grouped by cluster
│   │   └── [slug]/page.tsx     THE library page template
│   └── services/[slug]/page.tsx
├── components/
│   ├── Schema.tsx              Organization, Person, Article, FAQ, Breadcrumb JSON-LD
│   └── Reviews.tsx             review display
├── lib/
│   ├── site.ts                 CANONICAL FACTS — single source of truth
│   ├── supabase.ts             service-role client, server only
│   ├── reviews.ts              build-time review fetch, fails soft
│   └── content.ts              front-matter parsing
├── content/
│   ├── title-problems/         8 draft pages
│   └── services/               1 draft page
└── public/llms.txt
```

Builds clean. `npm run typecheck` passes. Nine content pages generate as static routes.

---

## Canonical facts — never paraphrase these into new claims

All verified against public records (FL DFS licensee search, FL Dept. of State notary search, Google Business Profile). They live in `lib/site.ts`.

- **Bayit Title LLC**, founded **2021**, Coral Springs, Florida. "Bayit" means home in Hebrew.
- Florida Title Insurance Agency License **W806540** (type 0412, issued 2021-11-22, NPN 20152864)
- Agent in Charge: **Batsheva "Shevy" Lowenstein**, Florida Title Agent License **W766033** (issued 2021-10-22, NPN 19304095)
- **In title since 2017. Florida-licensed since 2021.** Never write "Florida licensed since 2017."
- Underwriter: **First American Title Insurance Company**, agency appointment on public DFS record since 2021-12-09 (renews 2027-12-31)
- Office: 3301 N University Drive, Suite 100, Coral Springs, FL 33065
- Phone 754.253.2270 · Email shevy@bayittitle.com
- Coordinates 26.2719844, −80.2496001 · Google Place ID `ChIJk9WlCCUF2YgRgJbY8DFTw_A`
- Hours: Mon–Thu 9:00–5:00, Fri 9:00–12:00, closed weekends
- Team of four, all English-only:
  - Shevy Lowenstein — Founder, licensed title agent
  - Gedaliah Lowenstein — COO
  - Jennifer Simon — Processor, Florida Notary HH 795313 (exp. 2030-05-24)
  - Chaya Brooks — Closer, Florida Notary HH 817398 (exp. 2030-06-24)
- Closes throughout Florida, all 67 counties. All closing methods: in-office, mobile/concierge wherever the signer wants, and RON.
- **Never mention Pennsylvania**, prior careers outside title, or any other tenure claim.

---

## Supabase schema (already applied)

Nine tables in `public`, all with RLS enabled:

| Table | Purpose |
|---|---|
| `locations` | counties/cities; 3 priority counties seeded |
| `rate_tables` | **empty.** Superseded for rendering: the promulgated premium is in `lib/promulgated-premium.ts` (OIR rule 69O-186.003) and doc stamps and recording charges in `lib/statutory-rates.ts` |
| `google_reviews` | **92 reviews loaded**, full text, topic-tagged |
| `review_snapshot` | 5.0 / 92 for the homepage |
| `leads` | quote/contact forms |
| `orders` | title orders |
| `order_documents` | metadata; files in private bucket, 90-day purge default |
| `review_requests` | review-ask tracking |
| `ai_audit_log` | quarterly AI-visibility testing |

**Security posture, deliberate:** anon can INSERT into `leads` and `orders` only, and SELECT nothing anywhere. Reference tables have RLS on with zero policies — service role only. Trigger helper functions have EXECUTE revoked from public so they aren't callable as RPC. Storage bucket `order-documents` is private; access via short-lived signed URLs only. Security advisor is clean of warnings.

**Reviews data notes:** 92 rows, all 5-star, 85 with text. 48 name Shevy, 2 name Jennifer, none name Gedaliah or Chaya. Four industry professionals vouch publicly (two Realtors, a loan signing agent, a broker) plus a 20-year lender. Forty rows have `date_is_approximate = true` — dates were derived from "12 weeks ago" labels and two contradict their own owner-reply dates, so the UI hides dates on those rows rather than printing a guess.

---

## Design system

White ground, black text, one antique gold carrying every action — the same gold as the masthead mark.

```
--ink: #111            body text
--paper: #fff          page ground
--band: #faf7f0        alternating section grounds
--accent: #97701a      primary actions, rules, the live timeline step
--accent-deep: #6b4f0c links, eyebrows, chip text
--accent-dark: #2f2408 the masthead button, and nothing else
--accent-wash: #f7efdc chips, icon discs, answer panel
--flag: #6f1d2b        VERIFY banners and form errors only
```

Type: **Libre Caslon Text** for headings and quoted reviews, **DM Sans** for body copy, nav, labels and figures. The one bold element is the **answer panel** on library pages — pale gold ground, gold left rule — because that's the block an AI assistant lifts. `docs/ui-inventory.md` carries the full token table.

---

## Library page template

Front-matter (all required except `review_tags`):

```yaml
title, slug, cluster, direct_answer, counties[],
review_tags[], author, reviewed_on, next_review, related[]
```

Body order: H1 → direct answer (rendered from front-matter, 40–60 words, must stand alone) → quick facts → H2 sections phrased as questions → "How Bayit Title handles this" → when to involve an attorney → FAQ → related → byline → one quiet CTA.

`review_tags` pulls a matching Google review onto the page automatically.

---

## Content written so far

**8 library pages** in `content/title-problems/`:

1. `open-permits-before-closing-florida` — municipal lien search vs title search
2. `judgment-against-seller-before-closing-florida` — why "don't worry" isn't a status report
3. `litigation-against-seller-flip-florida` — **incomplete**, story lacked the title mechanics
4. `hoa-approval-delay-closing-florida` — **reviewed and published** 2026-09-20; a quoted 30 days done in 2 on an emergency
5. `foreign-seller-signing-from-abroad-florida` — highest search potential
6. `no-legal-access-landlocked-property-florida` — legal vs physical access; the Schedule B-II discovery
7. `non-standard-purchase-contract-florida-closing` — **reviewed and published** 2026-09-20, without a worked example; the changed terms would still strengthen it
8. `buying-property-bankruptcy-estate-florida` — the court's sale order is a title document

**1 service page** in `content/services/`: `mobile-and-remote-signings`

**Every page carries `[VERIFY]` flags** where I refused to state something unconfirmed — statutes, coverage positions, timelines. These are visible in the rendered page on purpose. They must be resolved by a licensed person before publishing. Do not let Claude Code fill them in from general knowledge; that is exactly the failure mode this project is designed to avoid.

---

## Voice rules (enforce in every draft)

- Answer first. No wind-up.
- "We," not "I."
- **No superlatives or comparisons.** Never best, fastest, #1, "unlike other title companies." Florida regulates title agency advertising. Authority comes from specificity, never assertion.
- Calm about risk. No fear framing.
- No client-identifying detail, ever. No names, addresses, prices, dates, professions.
- Never imply 24/7 or standing after-hours availability — reviews may describe it, the firm must not promise it.
- Banned: seamless, stress-free, concierge (as a tier), trusted, hassle-free, peace of mind, dream home, hero, rescue.
- No `AggregateRating` schema. Reviews were collected by Google, not on-site; marking them up as our own rating risks a manual action.

---

## What to build next, in order

1. **Order and quote forms** — Route Handlers writing to Supabase `leads`/`orders`, email notification to shevy@bayittitle.com, encrypted upload to the private bucket. This exercises the security design; get it right.
2. **Three county pages** — Broward, Palm Beach, Miami-Dade. **Built.** The promulgated premium schedule, doc stamps, the Miami-Dade surtax, mortgage stamps, intangible tax and recording charges are all published and cited (`lib/promulgated-premium.ts` and `lib/statutory-rates.ts`, read from the rule and the statutes on 2026-09-14). Who-pays custom for the owner's policy is settled too: buyer in Broward and Miami-Dade under FAR/BAR ¶9(c)(iii), seller in Palm Beach — verified 2026-09-14, see the `notes` on each `locations` row. ¶9(c) is a check-one election, so the executed contract still controls. Still open per county: recording turnaround where the clerk publishes one.
3. **Homepage, About, Team pages** — copy drafted in the voice guide; team bios have placeholders awaiting three team members' own sentences.
4. **Calculators** — **built.** `/calculator` works out the promulgated premium (original, reissue, simultaneous issue), documentary stamps, the Miami-Dade surtax, intangible tax and recording, for a purchase or a refinance, citing the rule or section on every line. The arithmetic is `lib/closing-estimate.ts`, which deliberately stops at the promulgated and statutory figures and prints what it is not counting. Our own fee, search and examination go in when there are verified numbers for them.
5. **Reviews sync** — Google Business Profile API access was rejected once (likely the gmail.com contact address). Reviews are seeded manually and work fine; the sync is an optimization, not a blocker.
6. **Redirects** — map every legacy Wix URL in `next.config.mjs`, including the Pennsylvania pages.

---

## Known blockers

- `rate_tables` empty, but nothing is waiting on it: the calculator and the county pages read the rule and the statutes from `lib/`
- Six pages make First American coverage statements that are unverified
- Timeline data is placeholder on every library page except the two published 2026-09-20
- Team bios need 2–3 sentences each from Gedaliah, Jennifer, Chaya
- No usable photography — nothing in the Instagram feed works at hero size
- Google Business Profile API rejected; reapply from a bayittitle.com address

---

## Companion documents

- `bayit-title-website-plan.md` — full strategy, sitemap, SEO/GEO checklist
- `bayit-title-voice-guide-and-bios.md` — voice rules, About story, four bios
- `claude-project-brief.md` — the drafting brief, source list, workflow
- `bayit-title-open-questions.md` — everything still needed from the client
- `bayit-title-story-gaps.md` / `.pdf` — details needed to strengthen the 8 pages

---

## The one rule that matters most

This is a licensed title agency's website. A wrong statute, a wrong coverage claim, or an invented timeline is a real professional problem, not a content error. When a fact isn't available, write `[VERIFY: what's needed]` and move on. A draft with honest gaps is useful. A draft with confident fabrications is a liability.
