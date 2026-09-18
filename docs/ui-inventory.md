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
  license numbers, statute cites, named reviewers — never asserted. Any design
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

White ground, black text, one antique gold carrying every action — the same
gold as the masthead mark. No photography, no crest, no skyline: the page is
type, hairlines and a single accent, which is what the two audiences above are
actually here for.

The **answer panel** on library pages stays the one intentionally bold element,
because that is the block an AI assistant lifts and the block a hurried reader
reads first. The homepage adds two moving parts and no others: the services
ticker and the two figures that count up once on load.

### Colour tokens

| Token | Value | Role |
|---|---|---|
| `--ink` | `#111` | Body text. |
| `--paper` | `#fff` | Page ground. |
| `--band` | `#faf7f0` | Alternating section grounds. |
| `--accent` | `#97701a` | Primary actions, rules, the live timeline step. |
| `--accent-deep` | `#6b4f0c` | Links, eyebrows, chip text. |
| `--accent-dark` | `#2f2408` | The masthead button, and nothing else. |
| `--accent-wash` | `#f7efdc` | Chips, icon discs, answer panel, CTA. |
| `--flag` | `#6f1d2b` | VERIFY banners and form errors only. |
| `--ink-muted` | `#555` | Secondary text, labels, credential line. |
| `--ink-faint` | `#8a8070` | Steps not yet reached on the example file card. |
| `--rule` | `#e8e4db` | Chrome and section hairlines. |
| `--rule-card` | `#e3ded2` | Card, pill and panel edges. |
| `--rule-strong` | `#bdb3a0` | Input borders, which need a visible edge. |

Two off-token colours exist: `#fdf6f2`, the warm blush ground of the VERIFY
banner, and `#46360f` as the dark button's hover.

There is currently **no dark mode**.

### Type

- **Libre Caslon Text** (serif) — headings and quoted reviews. Weights 400/700,
  normal + italic.
- **DM Sans** (sans) — body copy, navigation, labels, figures, form fields,
  metadata, buttons, tables. Weights 400/500/600/700. Card titles are sans too:
  the serif is the voice of the headings, not of every title.

Headings are weight **400**, `line-height: 1.14`, `letter-spacing: -0.01em`,
`text-wrap: balance`. Body is `1.0625rem` at `line-height: 1.65`.

Scale: `--step-0` 1.0625rem · `--step-1` 1.25 · `--step-2` 1.5 ·
`--step-3` 1.9375 (h2) · `--step-4` 2.5 ·
`--step-5` `clamp(2.125rem, 1.35rem + 3.2vw, 3.25rem)` (h1). The homepage hero
sets its own clamp, up to `3.75rem`.

### Layout

- `--measure: 34rem` — the reading column. Most pages are a single column of
  this width, left-aligned, not centred text.
- `--wide: 77.5rem` — the page frame for headers, footers and card grids.
- `--gutter: 1.5rem` — horizontal page padding.
- Breakpoints restack the hero, the card grid, the figure strip and the
  quick-facts list. Everything else is intrinsically responsive via flex-wrap
  and `auto-fill` grids.

### Shape and motion

- `--radius: 6px` on buttons and inputs, `--radius-card: 12px` on cards and
  panels, `999px` on chips and ticker pills.
- Two shadows, both soft and both on white: `--shadow-card` under the hero's
  example-file card, `--shadow-pill` under the ticker pills. Everything else
  separates with 1px hairlines.
- Motion: `120ms` colour transitions on buttons, the services ticker's 46s
  linear scroll, and a 2.2s count-up on the two figures, once, on load. The
  ticker stops under `prefers-reduced-motion` and in print; the figures skip the
  count entirely under `prefers-reduced-motion` and are server-rendered at their
  final value, so nothing depends on the animation running. No reveals, no
  parallax.
- Focus: `2px solid var(--accent)`, `2px` offset.

---

## 4. Route map

24 routes. `[slug]` routes are statically generated at build time.

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
- `/calculator` — premium and closing cost calculator, the one interactive page
  that asks for nothing and stores nothing

**Machine-facing** (no visual design, but they exist)
- `/llms.txt`, `/robots.txt`, `/sitemap.xml`, `/api/leads`, `/api/orders`

**Also** `/not-found`

---

## 5. Component inventory

Class names are the real ones in `app/globals.css`.

### Site chrome

**Masthead** (`.masthead`) — 1px bottom hairline, `5rem` min-height, flex row
that wraps. Wordmark is the 38×42 brand mark beside "BAYIT" in Libre Caslon Text
1.4375rem with `0.04em` tracking, then "TITLE" at 0.8125rem with `0.28em`
tracking in `--accent-deep`. Nav is DM Sans 0.9375rem/500 with a transparent
bottom border that turns gold on hover, plus the dark button ("Open an order").

**Footer** (`.sitefoot`) — four auto-fit columns at `13rem` min: address/phone/
email, hours, pages, get started. Below them `.credential-line`: 0.8125rem
muted text carrying the legal name, agency license number, agent in charge and
license, underwriter, a plain-language "this is not legal advice" line, and
copyright. **This block is a compliance requirement, not decoration.**

### The library page, in body order

This sequence is fixed and is the core of the site:

1. **Breadcrumbs** — DM Sans 0.8125rem, muted, slash-separated
2. **Eyebrow** (`.eyebrow`) — cluster name. 0.78125rem, 600, uppercase, `0.14em`,
   in `--accent-deep`
3. **H1** — the reader's question verbatim ("There's a judgment against the
   seller. What happens to the closing?")
4. **Answer panel** (`.answer-panel`) — **the signature element.** Pale gold
   ground, 3px gold left rule, `1.5rem 1.75rem` padding. Contains an
   `--accent-deep` label "THE SHORT ANSWER" and 40–60 words at `--step-1`/1.55.
   Square, flat, no radius, no shadow.
5. **Draft banner** (`.verify-banner`, 2px) — only on unreviewed drafts
6. **VERIFY banner** (`.verify-banner`) — `--flag` border, 3px left, `#fdf6f2`
   ground, DM Sans 0.875rem, with a bulleted list of unresolved facts. Two
   variants: `flagged` on a library page, where every listed item also carries
   a `VERIFY` mark in the copy below, and `withheld` on a county page, where
   the items are facts deliberately absent from the page and there is no mark
   to point at
7. **Quick facts** (`.quick-facts`) — rounded 1px box with a 2px `--accent` top
   rule. Two-column `dl` (label column `8rem` min) that stacks below `34rem`
8. **Prose** (`.prose`) — H2s carry a top hairline and generous space above
9. **Review pull-quote** (`.review--pull`) — optional, topic-matched. Accent left
   rule, rounded on the outer corners
10. **Related situations** (`.linklist`) — hairline-separated rows, title plus
    a muted DM Sans subtitle
11. **Byline** (`.byline`) — top hairline, DM Sans 0.875rem muted. Names the
    licensed reviewer, their credential, review date and next review date
12. **Quiet CTA** (`.cta`) — pale gold rounded panel, flex row: one sentence of
    specific text, then a primary button and the phone number as a quiet button

### Other pieces

- **Buttons** — `.btn--primary` gold on white; `.btn--quiet` transparent with a
  1.5px ink border, pale gold on hover; `.btn--dark` is the masthead's and is
  used nowhere else. DM Sans 0.9375rem/600, `6px` radius.
- **Cards** (`.card-grid` / `.card`) — `auto-fill` grid at `17rem` min,
  `1.25rem` gap; `.card-grid--three` pins the homepage row to three columns.
  1px border, `12px` radius, no shadow. Optional `.chip` (pale gold pill,
  `--accent-deep` text), then a sans 600 title link; `.card__meta` is the older
  uppercase meta line, still used on the index pages.
- **Chips** (`.chip`) — pale gold pill, 0.75rem/600, used for cluster labels and
  for the "Example file" marker on the homepage card.
- **Link lists** (`.linklist`) — the dominant list pattern. Hairline rows,
  optional muted sub-line.
- **Reviews** — `.review` hairline-separated block with body text then a muted
  attribution line: accent stars, name, date, "Google review". **Many reviews
  deliberately show no date** — those dates were derived from relative labels
  and can't be trusted, so nothing is printed. The design must not require a
  date to be present.
- **Forms** — `.field` label/hint/input/error stack; `.field-row` is an
  `auto-fit` grid at `13rem`; `fieldset` + `legend` group sections with an
  uppercase DM Sans legend. Error state turns borders `--flag` and shows a
  0.8125rem message. `.form-status--ok` is a pale gold panel; `--error` is
  `--flag`-bordered. `.form-note` carries the wire-fraud warning.
- **Calculator** (`.calc`) — two columns capped at `56rem`, inputs left at
  `18rem` and figures right, stacking to one column below `52rem`. The figures
  panel (`.calc__result`) reuses the quick-facts frame: 1px border with a 2px
  `--accent` top rule. Each `.estimate-line` is a hairline row with the
  label and its citation left and a tabular-numeral amount right; the total
  sits under a 2px gold rule. **Every line carries its citation** — that is
  the design, not decoration, and a redesign must keep the figure and its
  authority in the same row.
- **Section grounds** (`.section--band`) — full-bleed `--band` bands, hairlined
  top and bottom, used to break up the homepage.

### Homepage-only pieces

- **Split hero** (`.hero__inner`) — copy left, the example file card right at
  `27.5rem`, stacking below `62rem`.
- **Example file card** (`.filecard` / `.filestep`) — rounded, shadowed panel
  holding the four steps of a file on a dot-and-rail timeline, walked by a
  gold-wash disc: it rests on a dot, then travels to the next one carrying that
  step's icon — file, magnifying glass, key, house. A dot is an empty
  `--rule-card` ring until the disc lands on it and fills it gold, the rail
  fills behind the disc as it goes, and a step's text sits at 45% until the
  file has reached it. Fourteen seconds top to bottom, then it rewinds and
  starts again. No JavaScript: every row animates across its own height, and a
  row is exactly one dot-to-dot span, so nothing has to be measured. For a
  reader who has asked for less motion the animation is off and the card
  renders its finished state — every dot gold, every step at full contrast,
  the disc resting on the last dot. It is labelled "Example file" because it is
  a sequence, not a schedule.
- **Services ticker** (`.ticker`) — full-bleed band of pill cards, one per
  headline transaction type (Residential, Commercial, Refinance, 1031 Exchange,
  FIRPTA), scrolling left over 46s. The run repeats four times so it fills a
  wide screen and the half-width shift loops without a seam; only the first
  copy is announced, the rest are `aria-hidden`. Faded edges both sides.
- **Figure strip** (`.figures__grid`) — four columns: two figures with gold left
  rules that count up once on load (`components/CountUp.tsx`), then a Google
  review across the remaining two with an accent rule, accent stars and the
  quote set in Libre Caslon Text. The quote rotates through eighteen reviews,
  four seconds each (`components/RotatingQuote.tsx`): the five rows marked
  `is_featured` in Supabase and then the next thirteen in the site's own order,
  each short enough for the two columns the quote has. All eighteen are in the
  HTML, stacked in one grid cell so the strip is as tall as the longest and a
  rotation never moves the page; the first is the one on show without
  JavaScript, in print, and for a reader who has asked for less motion.
  Eighteen dots sit under the quote — 8px, `--rule-strong`, the one on show in
  `--accent` and a quarter larger, each with a 24px hit area and the reviewer's
  name as its label. A dot goes to that review and ends the rotation, which is
  also the stop control the auto-advance needs; the pointer or the keyboard
  focus resting on the strip holds it meanwhile. At eighteen the dots fill the
  quote's two columns, so they take a line of their own and wrap within it on a
  narrow screen, with "Read all Google reviews →" following underneath and
  linking to `/reviews` — the section head treatment at `0.8125rem`. The whole
  strip degrades to the counties figure alone if Supabase is unreachable.
- **Underwriter credit** (`.underwriter`) — under the figure strip, above a
  hairline top rule: the First American lockup at `1.875rem` tall, a vertical
  rule, then "Policies underwritten by First American Title Insurance Company"
  at `0.8125rem` in `--ink-muted`. It sits with the figures because it is the
  same kind of statement they are — a checkable fact rather than a claim. Below
  `30rem` the sentence drops under the mark and the vertical rule comes off, so
  the company name does not break mid-phrase. The sentence is `underwriterLine`
  in `lib/site.ts`, which the footer credential line also reads, so the two
  cannot drift apart.

---

## 6. Current state — what a designer will actually see

**The production site looks sparse, by design.** All nine written content pages
are `status: draft`, and unreviewed drafts are excluded from production builds
until a licensed agent signs off. So right now:

- The homepage's title-problems section has **no cards under it**
- `/title-problems` lists **nothing**
- The chrome, `/about`, `/team`, `/contact`, `/order`, `/quote` and the three
  county pages are fully populated and real

To see the site with content, a preview deployment with `SHOW_DRAFTS=1` renders
all nine pages with the draft banner.

---

## 7. Open questions for design

1. **Photography.** There is none. Nothing in the firm's Instagram works at hero
   size. Apart from the brand mark, the underwriter's lockup under the figure
   strip and the ticker's line icons the site carries **no imagery**, and the
   hero has none by design.
2. **A vector logo.** The masthead mark is `public/brand/mark-t.png`, a raster
   crop with a transparent ground. An SVG would be better at every size.
3. **The homepage hero** is a headline, a paragraph, one button and the example
   file card. The card carries the hero now; whether that is enough without
   photography is still worth a designer's eye.
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
- The citation on every calculator line, and the list of what it is not counting
- The byline block on every content page
- The reading measure of ~34rem for body copy
