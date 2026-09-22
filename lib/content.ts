// Written content lives in content/ as Markdown with front-matter, versioned in
// Git and rendered statically at build time. Supabase is never on the critical
// rendering path. See HANDOFF.md.

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkHtml from 'remark-html';

import { faqEntries, isFaqHeading, toPlainText, type FaqItem } from './faq';

export const CLUSTERS = [
  'liens',
  'family',
  'investor',
  'property-type',
  'survey',
  'records',
  'tax',
  'distressed',
  'process',
] as const;

export type Cluster = (typeof CLUSTERS)[number];

export const CLUSTER_LABELS: Record<Cluster, string> = {
  liens: 'Liens and encumbrances',
  family: 'Family, estates and heirs',
  investor: 'Investors and entities',
  'property-type': 'Property types',
  survey: 'Survey, access and boundaries',
  records: 'Records and chain of title',
  tax: 'Taxes and assessments',
  distressed: 'Distressed and court-ordered sales',
  process: 'The closing process',
};

/**
 * A page is either an unreviewed draft or has been read and signed off by a
 * licensed title agent. Only `reviewed` pages reach production — see
 * `isPublishable` below. This is the one non-negotiable in the project brief,
 * so it is enforced by the build rather than by process.
 */
export type DocStatus = 'draft' | 'reviewed';

/**
 * The one-line caption beside a cluster heading on the index. It says what the
 * cluster covers in the reader's terms, which the label alone does not: "Liens
 * and encumbrances" names a category, "Recorded against the property or the
 * seller" says which pile a file belongs in. Optional, because a cluster with
 * no page in it never renders and a new one should not block the build.
 */
export const CLUSTER_CAPTIONS: Partial<Record<Cluster, string>> = {
  liens: 'Recorded against the property or the seller',
  distressed: 'Where a court order is a title document',
  process: 'Contracts, signings and who does what',
  'property-type': 'Condominiums, HOAs, new construction',
  survey: 'What the survey shows versus what the record supports',
};

/**
 * The direct answer, as the reader's first question rather than as prose: does
 * this stop the closing, who fixes it, how long, what it costs, is a lawyer
 * needed. It renders as the card beside the H1, above the fold, in the first
 * HTML the server sends — which is what a snippet or an assistant reads.
 *
 * `short` is the same verdict at index length, so the card for this page in the
 * library reads "STOPS THE CLOSING? RARELY" without opening it.
 */
/** A term and its detail — a quick fact, or a row of the verdict card. */
export interface KeyFact {
  term: string;
  detail: string;
  /**
   * `detail`, rendered.
   *
   * These lines carry Markdown, and the statute links in them are the whole
   * point of the fact: "statutory interest runs under Fla. Stat. § 55.03" is
   * only checkable if the citation is a link. Rendered at build time beside the
   * body so a reader is never shown the raw `[text](url)`.
   */
  html?: string;
}

export interface Verdict {
  /**
   * One sentence, in the cap of the card. A `<p>`, never a heading.
   *
   * Optional, and the card is hidden without it. A page can carry its index
   * label before anyone has written and checked the sentence that goes above
   * the fold, and a card capped with a guess is worse than no card: it is the
   * first thing a reader sees and the line an assistant quotes.
   */
  headline?: string;
  /** Two or three words for the index card label. */
  short: string;
  /** Key/value rows. Optional: a page with no confirmed rows shows the cap alone. */
  rows: KeyFact[];
}

/** One card in the "what happens, in order" band. */
export interface Step {
  title: string;
  body: string;
}

/**
 * A `## ` heading and the body under it, rendered on its own so the page can
 * lay each one out differently — a callout for our own practice, a disclosure
 * list for the questions — and so the rail can link to it by id.
 */
export interface DocSection {
  /** Slug of the heading text; the anchor the rail links to. */
  id: string;
  /** The heading, as plain text. */
  title: string;
  /** The body under the heading, rendered. Never empty: see `splitSections`. */
  html: string;
  kind: SectionKind;
}

/**
 * How a section is laid out. Derived from the heading rather than from a new
 * markup convention, because every page already uses the same two headings for
 * these two things and an author should not have to learn a container syntax to
 * keep that working.
 */
export type SectionKind = 'prose' | 'practice' | 'faq';

export interface DocFrontMatter {
  status: DocStatus;
  title: string;
  slug: string;
  cluster: Cluster;
  direct_answer: string;
  counties: string[];
  review_tags: string[];
  /** Present only on a reviewed page — the byline belongs to the reviewer. */
  author?: string;
  reviewed_on?: string;
  next_review?: string;
  related: string[];
  /** Optional one-line summary for index cards and meta descriptions. */
  summary?: string;
  /**
   * Facts that were drafted rather than sourced — an underwriting position, a
   * licensed form's wording, or one of our own timelines, costs or practices.
   * A `[VERIFY]` flag keeps its question visible in the rendered page; this
   * keeps the question attached to the file once the prose reads as finished,
   * which is the more dangerous state. A page cannot be marked `reviewed`
   * while this list is non-empty.
   */
  pending_confirmation?: string[];
  /** Quick-facts box: who this affects, typical timeline, documents, cost impact. */
  quick_facts?: KeyFact[];
  /**
   * The answer to "does this stop the closing?", rendered beside the H1.
   * Optional: a page written before the field existed renders without the card
   * rather than with an empty one, and the hero falls back to one column.
   */
  verdict?: Verdict;
  /** The order the work happens in. Optional; the step band is hidden without it. */
  steps?: Step[];
  /** Minutes, for the hero meta row. Omitted rather than estimated. */
  read_time?: number;
}

export interface Doc extends DocFrontMatter {
  /** Rendered HTML for the body, front-matter stripped. */
  html: string;
  /** The same body, split at its `## ` headings so each part can be laid out. */
  sections: DocSection[];
  /**
   * The questions under the FAQ heading, each answer rendered as the page shows
   * it. Unfiltered: a draft's flagged answer is shown with its flag, as every
   * other flag on the page is. `extractFaq` is what filters for the JSON-LD.
   */
  faq: FaqItem[];
  /** Raw Markdown body, used to detect unresolved [VERIFY] flags. */
  raw: string;
  /** Every `[VERIFY: ...]` flag on the page — answer, quick facts and body. */
  verifyFlags: string[];
  collection: Collection;
  wordCount: number;
}

export type Collection = 'title-problems' | 'services';

const CONTENT_ROOT = path.join(process.cwd(), 'content');

const REQUIRED_FIELDS: (keyof DocFrontMatter)[] = [
  'status',
  'title',
  'slug',
  'cluster',
  'direct_answer',
  'counties',
  'related',
];

/** Only a reviewed page carries a byline, so only a reviewed page needs its dates. */
const REVIEWED_ONLY_FIELDS: (keyof DocFrontMatter)[] = ['author', 'reviewed_on', 'next_review'];

/**
 * Drafts are visible in development and on Vercel preview deployments so the
 * team can read them, and never on the production site.
 */
export const SHOW_DRAFTS =
  process.env.SHOW_DRAFTS === '1' ||
  process.env.VERCEL_ENV === 'preview' ||
  process.env.NODE_ENV !== 'production';

export function isPublishable(frontMatter: { status: DocStatus }): boolean {
  return frontMatter.status === 'reviewed' || SHOW_DRAFTS;
}

/** `[VERIFY: what's needed]` — kept visible in the rendered page on purpose. */
const VERIFY_PATTERN = /\[VERIFY:?([^\]]*)\]/g;

export function findVerifyFlags(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(VERIFY_PATTERN)) {
    found.push(match[1].trim() || 'unspecified');
  }
  return found;
}

/**
 * Every part of a page a flag can be written into and a reader can see: the
 * direct answer, the quick-facts box and the body. The banner counts flags
 * from this, so its count matches the number of VERIFY marks on the page —
 * a banner that says six while the page shows eight teaches the reader to
 * distrust both.
 */
function flaggableText(
  data: { direct_answer?: unknown; quick_facts?: unknown; verdict?: unknown; steps?: unknown },
  body: string,
): string {
  const facts = Array.isArray(data.quick_facts)
    ? (data.quick_facts as { term?: string; detail?: string }[])
    : [];

  const verdict = (data.verdict ?? {}) as { headline?: unknown; short?: unknown; rows?: unknown };
  // Called twice with the same field in two shapes: once on the raw
  // front-matter, where a row is the `[term, detail]` pair an author wrote, and
  // once on the normalised page, where it is a `{ term, detail }`. Both have to
  // be read, because a flag written into either has to be counted.
  const rows = (Array.isArray(verdict.rows) ? verdict.rows : []).map((row) =>
    Array.isArray(row)
      ? row.map((cell) => String(cell ?? '')).join(' ')
      : `${(row as KeyFact)?.term ?? ''} ${(row as KeyFact)?.detail ?? ''}`,
  );
  const steps = Array.isArray(data.steps)
    ? (data.steps as { title?: string; body?: string }[])
    : [];

  return [
    String(data.direct_answer ?? ''),
    ...facts.map((fact) => `${fact.term ?? ''} ${fact.detail ?? ''}`),
    // The verdict card is the most prominent block on the page and the one an
    // assistant is most likely to quote, so an unresolved fact written into it
    // has to count the same as one written into the body.
    String(verdict.headline ?? ''),
    String(verdict.short ?? ''),
    ...rows,
    ...steps.map((step) => `${step.title ?? ''} ${step.body ?? ''}`),
    body,
  ].join('\n');
}

function assertFrontMatter(
  data: Record<string, unknown>,
  body: string,
  file: string,
): DocFrontMatter {
  const missing = REQUIRED_FIELDS.filter((field) => data[field] === undefined);
  if (missing.length > 0) {
    throw new Error(`${file}: missing required front-matter: ${missing.join(', ')}`);
  }

  const status = data.status as DocStatus;
  if (status !== 'draft' && status !== 'reviewed') {
    throw new Error(`${file}: status must be "draft" or "reviewed", got "${String(status)}".`);
  }

  if (status === 'reviewed') {
    const missingReview = REVIEWED_ONLY_FIELDS.filter((field) => data[field] === undefined);
    if (missingReview.length > 0) {
      throw new Error(
        `${file}: a reviewed page must name its reviewer and dates. Missing: ${missingReview.join(', ')}`,
      );
    }

    // A page cannot claim a licensed review while it still contains unresolved
    // facts. Resolving them is the review.
    const unresolved = findVerifyFlags(flaggableText(data, body));
    if (unresolved.length > 0) {
      throw new Error(
        `${file}: status is "reviewed" but ${unresolved.length} VERIFY flag(s) remain: ` +
          `${unresolved.join('; ')}. Resolve them or set status: draft.`,
      );
    }

    // Prose that reads as finished but was never sourced is the failure mode a
    // VERIFY flag cannot catch, because there is no flag left in the text.
    const pending = (data.pending_confirmation as string[] | undefined) ?? [];
    if (pending.length > 0) {
      throw new Error(
        `${file}: status is "reviewed" but ${pending.length} drafted fact(s) are still ` +
          `unconfirmed: ${pending.join('; ')}. Confirm them and empty ` +
          `pending_confirmation, or set status: draft.`,
      );
    }
  }

  const cluster = data.cluster as Cluster;
  if (!CLUSTERS.includes(cluster)) {
    throw new Error(`${file}: unknown cluster "${cluster}". Expected one of ${CLUSTERS.join(', ')}`);
  }

  // The direct answer is the block an AI assistant lifts. It has to stand alone
  // at 40-60 words. A short one is a build error, not a style note.
  const answerWords = countWords(String(data.direct_answer));
  if (answerWords < 25) {
    throw new Error(
      `${file}: direct_answer is ${answerWords} words. It must stand alone at 40-60 words.`,
    );
  }

  return {
    ...(data as unknown as DocFrontMatter),
    counties: (data.counties as string[]) ?? [],
    pending_confirmation: (data.pending_confirmation as string[]) ?? [],
    quick_facts: (data.quick_facts as DocFrontMatter['quick_facts']) ?? [],
    review_tags: (data.review_tags as string[]) ?? [],
    related: (data.related as string[]) ?? [],
    ...(data.verdict === undefined ? {} : { verdict: assertVerdict(data.verdict, file) }),
    ...(data.steps === undefined ? {} : { steps: assertSteps(data.steps, file) }),
  };
}

/**
 * The verdict card, checked rather than trusted.
 *
 * It is the first thing on the page and the block a search engine or an
 * assistant lifts, so a half-written one is worse than none at all: a card
 * whose cap says nothing, or whose rows have lost their labels, answers the
 * reader's first question wrongly and does it above the fold. A malformed one
 * fails the build.
 *
 * Rows are written as pairs in the front-matter, which is how they read on the
 * page — `[ "Who resolves it", "The seller, from proceeds" ]` — and are turned
 * into terms and details here.
 */
function assertVerdict(value: unknown, file: string): Verdict {
  const raw = value as { headline?: unknown; short?: unknown; rows?: unknown };

  if (raw?.headline !== undefined && (typeof raw.headline !== 'string' || !raw.headline.trim())) {
    throw new Error(`${file}: verdict.headline must be a non-empty string when it is set.`);
  }
  if (typeof raw?.short !== 'string' || raw.short.trim() === '') {
    throw new Error(`${file}: verdict.short must be a non-empty string — the index card label.`);
  }

  const rows = (Array.isArray(raw.rows) ? raw.rows : []).map((row, index) => {
    const pair = Array.isArray(row) ? row : [];
    const [term, detail] = pair;
    if (typeof term !== 'string' || typeof detail !== 'string' || !term.trim() || !detail.trim()) {
      throw new Error(
        `${file}: verdict.rows[${index}] must be a [term, detail] pair of non-empty strings.`,
      );
    }
    return { term: term.trim(), detail: detail.trim() };
  });

  // Rows with no headline would render as a capless card, so they travel
  // together: a page either has the sentence or has neither.
  if (rows.length > 0 && !raw.headline) {
    throw new Error(`${file}: verdict.rows are set without a verdict.headline to cap them.`);
  }

  return {
    ...(raw.headline ? { headline: String(raw.headline).trim() } : {}),
    short: raw.short.trim(),
    rows,
  };
}

function assertSteps(value: unknown, file: string): Step[] {
  if (!Array.isArray(value)) {
    throw new Error(`${file}: steps must be a list of { title, body }.`);
  }

  return value.map((entry, index) => {
    const step = entry as { title?: unknown; body?: unknown };
    if (typeof step?.title !== 'string' || typeof step.body !== 'string') {
      throw new Error(`${file}: steps[${index}] must have a string title and body.`);
    }
    return { title: step.title.trim(), body: step.body.trim() };
  });
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

async function toHtml(markdown: string): Promise<string> {
  const processed = await remark()
    .use(remarkGfm)
    .use(remarkHtml, { sanitize: false })
    .process(markdown);
  return String(processed);
}

/**
 * One line of front-matter, rendered as Markdown without a paragraph around it.
 *
 * `remark-html` wraps a lone line in `<p>`, which would put a block inside the
 * `<dd>` of a definition row and break its baseline against the term beside it.
 */
async function toInlineHtml(markdown: string): Promise<string> {
  const rendered = (await toHtml(markdown)).trim();
  const single = /^<p>([\s\S]*)<\/p>$/.exec(rendered);
  return (single ? single[1] : rendered).trim();
}

/** Renders the Markdown in every key/value line the page shows. */
async function renderFacts(facts: KeyFact[]): Promise<KeyFact[]> {
  return Promise.all(
    facts.map(async (fact) => ({ ...fact, html: await toInlineHtml(fact.detail) })),
  );
}

/** A heading, as an anchor: the id the rail links to and the URL a reader shares. */
function headingId(heading: string): string {
  return (
    heading
      .toLowerCase()
      // Curly quotes and the straight ones survive `\w`, and a heading here is
      // as often a quoted sentence as a phrase. Strip them before slugifying so
      // "“The seller’s agent says not to worry about it.”" does not become a
      // string of hyphens.
      .replace(/[‘’“”'"]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'section'
  );
}

/** Heading text with its Markdown emphasis, links and code removed. */
function headingText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .trim();
}

/** Our own practice, which the page sets apart from the law it has just explained. */
const PRACTICE_HEADING = /\bhandles this\b/i;

/**
 * Splits a body at its `## ` headings.
 *
 * The page template needs the parts, not the blob: the rail links to each one
 * by id, the questions render as a disclosure list, and the section describing
 * what this office does is set in a callout so a reader can see where the law
 * stops and our practice starts. Splitting the Markdown and rendering each part
 * separately — rather than cutting up the rendered HTML — keeps that off the
 * critical path of a regular expression run over markup.
 *
 * Anything before the first heading is kept as a leading section with no title,
 * so a body that opens with a paragraph does not lose it.
 *
 * A heading with nothing under it, or the same question asked twice, fails the
 * build. Both have reached a reviewed page before: the second copy of a heading
 * rendered as an empty section and the rail listed the question twice, and
 * neither is something a reader can be shown while the page claims a review.
 */
async function splitSections(markdown: string, file: string): Promise<DocSection[]> {
  const lines = markdown.split('\n');
  const parts: { title: string; body: string[] }[] = [];
  let fenced = false;

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;

    const heading = fenced ? null : /^##\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading && !line.startsWith('###')) {
      parts.push({ title: headingText(heading[1]), body: [] });
      continue;
    }

    if (parts.length === 0) {
      if (line.trim() === '') continue;
      parts.push({ title: '', body: [] });
    }
    parts[parts.length - 1].body.push(line);
  }

  const asked = new Set<string>();
  for (const part of parts) {
    if (!part.title) continue;
    if (part.body.join('').trim() === '') {
      throw new Error(`${file}: the section "${part.title}" has no body under its heading.`);
    }
    const question = part.title.toLowerCase();
    if (asked.has(question)) {
      throw new Error(`${file}: the heading "${part.title}" appears twice on the page.`);
    }
    asked.add(question);
  }

  const used = new Map<string, number>();

  return Promise.all(
    parts.map(async (part) => {
      // Two headings can slugify the same way — the same question asked in two
      // sections of a long page. A duplicate id makes one of the rail's links
      // scroll to the wrong place, so the second one is numbered.
      const base = part.title ? headingId(part.title) : 'introduction';
      const seen = used.get(base) ?? 0;
      used.set(base, seen + 1);

      return {
        id: seen === 0 ? base : `${base}-${seen + 1}`,
        title: part.title,
        html: await toHtml(part.body.join('\n').trim()),
        kind: sectionKind(part.title),
      };
    }),
  );
}

async function renderFaq(markdown: string): Promise<FaqItem[]> {
  return Promise.all(
    faqEntries(markdown).map(async (entry) => ({
      question: entry.question,
      answer: toPlainText(entry.markdown),
      html: await toHtml(entry.markdown),
    })),
  );
}

function sectionKind(title: string): SectionKind {
  if (!title) return 'prose';
  if (isFaqHeading(title)) return 'faq';
  if (PRACTICE_HEADING.test(title)) return 'practice';
  return 'prose';
}

function collectionDir(collection: Collection): string {
  return path.join(CONTENT_ROOT, collection);
}

/** Every slug on disk, drafts included. */
export function listSlugs(collection: Collection): string[] {
  const dir = collectionDir(collection);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => file.replace(/\.md$/, ''));
}

/**
 * Slugs that should have a route in this environment. Used by
 * generateStaticParams, so an unreviewed draft has no URL in production at all
 * rather than a URL that 404s.
 */
export function listRoutableSlugs(collection: Collection): string[] {
  const dir = collectionDir(collection);
  if (!fs.existsSync(dir)) return [];

  return listSlugs(collection).filter((slug) => {
    const { data } = matter(fs.readFileSync(path.join(dir, `${slug}.md`), 'utf8'));
    return isPublishable({ status: data.status as DocStatus });
  });
}

export async function getDoc(collection: Collection, slug: string): Promise<Doc | null> {
  const file = path.join(collectionDir(collection), `${slug}.md`);
  if (!fs.existsSync(file)) return null;

  const source = fs.readFileSync(file, 'utf8');
  const { data, content } = matter(source);
  const relativePath = `content/${collection}/${slug}.md`;
  const frontMatter = assertFrontMatter(data, content, relativePath);

  if (frontMatter.slug !== slug) {
    throw new Error(
      `${relativePath}: front-matter slug "${frontMatter.slug}" does not match its filename.`,
    );
  }

  const [quickFacts, verdictRows] = await Promise.all([
    renderFacts(frontMatter.quick_facts ?? []),
    renderFacts(frontMatter.verdict?.rows ?? []),
  ]);

  return {
    ...frontMatter,
    quick_facts: quickFacts,
    ...(frontMatter.verdict ? { verdict: { ...frontMatter.verdict, rows: verdictRows } } : {}),
    html: await toHtml(content),
    sections: await splitSections(content, relativePath),
    faq: await renderFaq(content),
    raw: content,
    verifyFlags: findVerifyFlags(flaggableText(frontMatter, content)),
    collection,
    wordCount: countWords(content),
  };
}

export async function getAllDocs(collection: Collection): Promise<Doc[]> {
  const docs = await Promise.all(listSlugs(collection).map((slug) => getDoc(collection, slug)));
  return docs
    .filter((doc): doc is Doc => doc !== null && isPublishable(doc))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export async function getDocsByCluster(
  collection: Collection,
): Promise<{ cluster: Cluster; label: string; docs: Doc[] }[]> {
  const docs = await getAllDocs(collection);
  return CLUSTERS.map((cluster) => ({
    cluster,
    label: CLUSTER_LABELS[cluster],
    docs: docs.filter((doc) => doc.cluster === cluster),
  })).filter((group) => group.docs.length > 0);
}

/** Resolves `related` slugs to real docs, dropping any that no longer exist. */
export async function getRelated(doc: Doc): Promise<Doc[]> {
  const all = await getAllDocs(doc.collection);
  const bySlug = new Map(all.map((entry) => [entry.slug, entry]));
  return doc.related
    .map((slug) => bySlug.get(slug))
    .filter((entry): entry is Doc => entry !== undefined && entry.slug !== doc.slug);
}
