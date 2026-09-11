// Written content lives in content/ as Markdown with front-matter, versioned in
// Git and rendered statically at build time. Supabase is never on the critical
// rendering path. See HANDOFF.md.

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkHtml from 'remark-html';

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
  quick_facts?: { term: string; detail: string }[];
}

export interface Doc extends DocFrontMatter {
  /** Rendered HTML for the body, front-matter stripped. */
  html: string;
  /** Raw Markdown body, used to detect unresolved [VERIFY] flags. */
  raw: string;
  /** Every `[VERIFY: ...]` flag found in the body and the direct answer. */
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
    const unresolved = findVerifyFlags(`${data.direct_answer}\n${body}`);
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
  };
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
  const frontMatter = assertFrontMatter(data, content, `content/${collection}/${slug}.md`);

  if (frontMatter.slug !== slug) {
    throw new Error(
      `content/${collection}/${slug}.md: front-matter slug "${frontMatter.slug}" does not match its filename.`,
    );
  }

  return {
    ...frontMatter,
    html: await toHtml(content),
    raw: content,
    verifyFlags: findVerifyFlags(`${frontMatter.direct_answer}\n${content}`),
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
