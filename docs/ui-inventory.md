# bayittitle.com — UI inventory

A handoff document for design work. Everything below is transcribed from the
live code, not from memory: tokens from `app/globals.css`, fonts from
`app/layout.tsx`, routes from the `app/` tree, components from `components/`.

**Live:** https://bayit-title-website.vercel.app
**Stack:** Next.js 16 App Router, React 19, plain CSS with custom properties.
No CSS framework, no component library, no CSS-in-JS.

---

## 1. What this site is

A Florida title insurance agency's marketing and content site. The strategy is a
deep library of pages answering specific, complicated title problems, each
written so a machine can quote it. Two audiences, in this order:

1. **An AI assistant** looking for a quotable, attributable answer.
2. **A person** — usually a real estate agent, lender or buyer mid-transaction,
   often anxious, often on a phone, looking for one specific answer.

Neither is browsing for pleasure. The design serves reading and scanning.

---

## 2. Constraints a designer must know

These are not preferences. They come from Florida regulation of title agency
advertising and from the firm's professional exposure.

- **No superlatives or comparisons.** No "best", "fastest", "#1", "trusted",
  "unlike other title companies". Authority is demonstrated by specificity —
  licence numbers, statute cites, named reviewers — never asserted. Any design
  that needs a "Why choose us?" badge is the wrong design.
- **No `AggregateRating` star display as our own rating.** Reviews were
  collected by Google. They can be shown and attributed, never aggregated into
  a site-owned score badge.
- **No stock photography of handshakes, keys, or families on lawns.** There is
  currently **no usable photography at all** — see Open Questions.
- **Calm about risk.** No urgency banners, countdowns, red alert styling for
  ordinary content, or fear framing.
- **No 24/7 or always-available implication.** Office hours are finite and
  stated plainly.
- Banned words: seamless, stress-free, concierge (as a tier), trusted,
  hassle-free, peace of mind, dream home, hero, rescue.

---

## 3. Design direction as built

Grounded in the firm's own office — warm neutrals, wood, plants, a yellow-green
wall. Deliberately **not** the default title-agency look (navy/gold, cream/serif,
terracotta, skyline photography).

The one intentionally bold element is the **answer panel** on library pages,
because that is the block an AI assistant lifts and the block a hurried reader
reads first. Everything else is quiet.

### Colour tokens

| Token | Value | Role |
|---|---|---|
| `--ink` | `#14231b` | Deep forest. Body text. |
| `--paper` | `#faf9f5` | Warm white. Page ground. |
| `--sage` | `#e4e8d2` | The office wall. Section grounds, answer panel, CTA. |
| `--sage-deep` | `#c3cba4` | Quick-facts top rule, pull-quote rule. |
| `--moss` | `#3f5940` | Links, answer-panel label, review stars. |
| `--oxblood` | `#6f1d2b` | Primary actions, answer-panel rule, VERIFY flags. **Sparingly.** |
| `--ink-muted` | `#4c5c53` | Secondary text, eyebrows, credential line. |
| `--rule` | `#d9d8ce` | Hairlines, card borders. |
| `--rule-strong` | `#b9b8ab` | Input borders, quiet button border. |

One off-token colour exists: `#fdf6f2`, the warm blush ground of the VERIFY
banner, and `#58161f` as the oxblood hover.

There is currently **no dark mode**.

### Type

- **Newsreader** (serif) — all prose and all headings. Weights 400/500/600,
  normal + italic. This is a reading-heavy site; the serif is the default, not
  the accent.
- **Archivo** (sans) — navigation, labels, credential lines, form fields,
  metadata, buttons, tables. Weights 400/500/600.

Headings are weight **500**, `line-height: 1.18`, `letter-spacing: -0.011em`,
`text-wrap: balance`. Body is `1.0625rem` at `line-height: 1.65`.

Scale: `--step-0` 1.0625rem · `--step-1` 1.25 · `--step-2` 1.5 ·
`--step-3` 1.9375 (h2) · `--step-4` 2.5 ·
`--step-5` `clamp(2.25rem, 1.4rem + 3.6vw, 3.5rem)` (h1).

### Layout

- `--measure: 34rem` — the reading column. Most pages are a single column of
  this width, left-aligned, not centred text.
- `--wide: 72rem` — the page frame for headers, footers and card grids.
- `--gutter: 1.5rem` — horizontal page padding.
- **One breakpoint in the entire stylesheet: `34rem`**, and it only restacks the
  quick-facts definition list. Everything else is intrinsically responsive via
  flex-wrap and `auto-fill` grids.

### Shape and motion

- `border-radius: 2px` on buttons and inputs. Nothing else is rounded. No cards
  with soft corners, no pills.
- **No shadows anywhere.** Separation is done with 1px hairlines.
- Motion is limited to `120ms` colour transitions on buttons. No scroll
  animation, no reveals, no parallax.
- Focus: `2px solid var(--oxblood)`, `2px` offset.

---

## 4. Route map

23 routes. `[slug]` routes are statically generated at build time.

**Content**
- `/` — homepage
- `/title-problems` — library index, grouped by cluster
- `/title-problems/[slug]` — **the library page template, the most important page on the site**
- `/services` — services index
- `/services/[slug]` — service page (same template family)
- `/counties` — county index
- `/counties/[slug]` — county page (Broward, Palm Beach, Miami-Dade)

**Firm**
- `/about`, `/team`, `/team/[slug]` (4 people), `/reviews`, `/contact`

**Conversion**
- `/order` — title order form, the largest form
- `/quote` — closing cost quote request

**Machine-facing** (no visual design, but they exist)
- `/llms.txt`, `/robots.txt`, `/sitemap.xml`, `/api/leads`, `/api/orders`

**Also** `/not-found`

---

## 5. Component inventory

Class names are the real ones in `app/globals.css`.

### Site chrome

**Masthead** (`.masthead`) — 1px bottom hairline, `4.75rem` min-height, flex row
that wraps. Wordmark is "Bayit Title" in Newsreader 1.375rem beside
"BAYIT MEANS HOME" in Archivo 0.6875rem, uppercase, `0.1em` tracking, muted.
Nav is Archivo 0.9375rem with a transparent bottom border that turns oxblood on
hover, plus one primary button ("Open an order").

**Footer** (`.sitefoot`) — four auto-fit columns at `13rem` min: address/phone/
email, hours, pages, get started. Below them `.credential-line`: 0.8125rem
muted text carrying the legal name, agency licence number, agent in charge and
licence, underwriter, a plain-language "this is not legal advice" line, and
copyright. **This block is a compliance requirement, not decoration.**

### The library page, in body order

This sequence is fixed and is the core of the site:

1. **Breadcrumbs** — Archivo 0.8125rem, muted, slash-separated
2. **Eyebrow** (`.eyebrow`) — cluster name. 0.75rem, 600, uppercase, `0.12em`
3. **H1** — the reader's question verbatim ("There's a judgment against the
   seller. What happens to the closing?")
4. **Answer panel** (`.answer-panel`) — **the signature element.** Sage ground,
   3px oxblood left rule, `1.5rem 1.75rem` padding. Contains a moss-coloured
   label "THE SHORT ANSWER" and 40–60 words at `--step-1`/1.55. Square, flat,
   no radius, no shadow.
5. **Draft banner** (`.verify-banner`, 2px) — only on unreviewed drafts
6. **VERIFY banner** (`.verify-banner`) — oxblood border, 3px left, `#fdf6f2`
   ground, Archivo 0.875rem, with a bulleted list of unresolved facts
7. **Quick facts** (`.quick-facts`) — 1px box with a 2px `--sage-deep` top rule.
   Two-column `dl` (label column `8rem` min) that stacks below `34rem`
8. **Prose** (`.prose`) — H2s carry a top hairline and generous space above
9. **Review pull-quote** (`.review--pull`) — optional, topic-matched
10. **Related situations** (`.linklist`) — hairline-separated rows, title plus
    a muted Archivo subtitle
11. **Byline** (`.byline`) — top hairline, Archivo 0.875rem muted. Names the
    licensed reviewer, their credential, review date and next review date
12. **Quiet CTA** (`.cta`) — sage ground, flex row: one sentence of specific
    text, then a primary button and the phone number as a quiet button

### Other pieces

- **Buttons** — `.btn--primary` oxblood on paper; `.btn--quiet` transparent with
  `--rule-strong` border, sage on hover. Archivo 0.9375rem/600, `2px` radius.
- **Cards** (`.card-grid` / `.card`) — `auto-fill` grid at `17rem` min,
  `1.25rem` gap. Flat, 1px border, no shadow. Title link, muted summary,
  uppercase meta line pushed to the bottom.
- **Link lists** (`.linklist`) — the dominant list pattern. Hairline rows,
  optional muted sub-line.
- **Reviews** — `.review` hairline-separated block with body text then a muted
  attribution line: moss stars, name, date, "Google review". **Many reviews
  deliberately show no date** — those dates were derived from relative labels
  and can't be trusted, so nothing is printed. The design must not require a
  date to be present.
- **Forms** — `.field` label/hint/input/error stack; `.field-row` is an
  `auto-fit` grid at `13rem`; `fieldset` + `legend` group sections with an
  uppercase Archivo legend. Error state turns borders oxblood and shows a
  0.8125rem message. `.form-status--ok` is a sage panel; `--error` is
  oxblood-bordered. `.form-note` carries the wire-fraud warning.
- **Section grounds** (`.section--sage`) — full-bleed sage bands used to break
  up the homepage.

---

## 6. Current state — what a designer will actually see

**The production site looks sparse, by design.** All nine written content pages
are `status: draft`, and unreviewed drafts are excluded from production builds
until a licensed agent signs off. So right now:

- The homepage's sage band has **no cards under it**
- `/title-problems` lists **nothing**
- The chrome, `/about`, `/team`, `/contact`, `/order`, `/quote` and the three
  county pages are fully populated and real

To see the site with content, a preview deployment with `SHOW_DRAFTS=1` renders
all nine pages with the draft banner.

---

## 7. Open questions for design

1. **Photography.** There is none. Nothing in the firm's Instagram works at hero
   size. The site currently has **zero images** — no logo mark, no icons, no
   illustrations, no favicon beyond the default. This is the single biggest gap.
2. **A logo.** "Bayit Title" is currently set in Newsreader as live text.
3. **The homepage hero** is a headline, a paragraph and two buttons on plain
   paper. It is honest but plain, and it is the weakest screen.
4. **Empty states.** The library index and homepage card grid have no designed
   empty state — they simply render nothing, which is what you will see today.
5. **Dark mode** — not built. Decide whether it is wanted.
6. **The answer panel on mobile** deserves specific attention: it is the block
   that matters most and it sits above the fold on a phone.
7. **Cluster identity.** Nine content clusters (liens, family, investor,
   property-type, survey, records, tax, distressed, process) currently have no
   visual differentiation beyond a text eyebrow.

---

## 8. What must not change without a reason

- The answer panel's prominence and its isolation from surrounding text
- The credential line in the footer
- Visible VERIFY flags — they are deliberately loud and deliberately public
- The byline block on every content page
- The reading measure of ~34rem for body copy
