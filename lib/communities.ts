// Community association pages: one for a master association and one for each
// Neighborhood or sub-association inside it, written in content/communities/
// as Markdown with front-matter, one folder per master community:
//
//   content/communities/heron-bay/index.md      the master association
//   content/communities/heron-bay/tuscany.md    a Neighborhood inside it
//
// They are built on the same parts as the library — the draft/reviewed gate,
// VERIFY flags, sections split at their `## ` headings, the FAQ parsed from the
// body — because they make the same kind of claim: what a recorded document
// says, stated by a title agency, with a licensed agent's name on it.

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

import {
  countWords,
  findVerifyFlags,
  isPublishable,
  renderFacts,
  renderFaq,
  splitSections,
  toHtml,
  type DocSection,
  type DocStatus,
  type KeyFact,
} from './content';
import type { FaqItem } from './faq';

export type CommunityKind = 'master' | 'neighborhood';

/** A Neighborhood the master page names but has no page of its own yet. */
export interface OtherNeighborhood {
  name: string;
  note: string;
}

export interface CommunityFrontMatter {
  status: DocStatus;
  kind: CommunityKind;
  /** The community as a reader says it — "Heron Bay", "Tuscany". Cards and breadcrumbs. */
  name: string;
  /** The page's headline. */
  title: string;
  /** A shorter title for search results, where the headline would be cut off. */
  seo_title?: string;
  /** The file's name: the folder's name for a master page, the file's for a Neighborhood. */
  slug: string;
  /** The association's name as incorporated, or a plain statement that it has none. */
  association: string;
  /** "Chapter 720 homeowners' association", "Chapter 718 condominium association". */
  association_type: string;
  /**
   * The sentence in the cap of the card beside the headline. Defaults to the
   * association's name and type; set it where that pair does not read as a
   * sentence — a Neighborhood with no association of its own, say.
   */
  headline?: string;
  /** The county slug, as the county pages use it. */
  county: string;
  /** City page slugs this community sits in, where the site has a page for the city. */
  cities: string[];
  /** 40–60 words, complete and quotable standing alone. */
  direct_answer: string;
  /** One line for the card on the master page and for the meta description. */
  summary?: string;
  /** The card beside the headline: the facts a closer asks for first. */
  at_a_glance: KeyFact[];
  /**
   * The recording date of the newest document the page was written from. A
   * reader needs it more than a review date: anything recorded after it is not
   * on the page.
   */
  documents_through: string;
  /** Other Neighborhoods in the same community worth reading beside this one. */
  related: string[];
  /** Master page only: Neighborhoods whose documents we do not hold yet. */
  others: OtherNeighborhood[];
  author?: string;
  reviewed_on?: string;
  next_review?: string;
  /** Drafted facts still to be confirmed. A reviewed page must have none. */
  pending_confirmation: string[];
}

export interface Community extends CommunityFrontMatter {
  /** The master community's folder name. Equal to `slug` on a master page. */
  community: string;
  path: string;
  sections: DocSection[];
  faq: FaqItem[];
  raw: string;
  verifyFlags: string[];
  wordCount: number;
}

const ROOT = path.join(process.cwd(), 'content', 'communities');

const REQUIRED: (keyof CommunityFrontMatter)[] = [
  'status',
  'kind',
  'name',
  'title',
  'slug',
  'association',
  'association_type',
  'county',
  'direct_answer',
  'at_a_glance',
  'documents_through',
];

const REVIEWED_ONLY: (keyof CommunityFrontMatter)[] = ['author', 'reviewed_on', 'next_review'];

export function communityPath(community: string, slug?: string): string {
  return slug && slug !== community ? `/communities/${community}/${slug}` : `/communities/${community}`;
}

function fileFor(community: string, slug: string): string {
  return path.join(ROOT, community, slug === community ? 'index.md' : `${slug}.md`);
}

/** Every master community folder on disk that has its index page. */
export function listCommunities(): string[] {
  if (!fs.existsSync(ROOT)) return [];
  return fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(ROOT, entry.name, 'index.md')))
    .map((entry) => entry.name)
    .sort();
}

/** Every Neighborhood slug in a community, drafts included. */
export function listNeighborhoods(community: string): string[] {
  const dir = path.join(ROOT, community);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.md') && file !== 'index.md')
    .map((file) => file.replace(/\.md$/, ''))
    .sort();
}

function statusOf(community: string, slug: string): DocStatus | null {
  const file = fileFor(community, slug);
  if (!fs.existsSync(file)) return null;
  return matter(fs.readFileSync(file, 'utf8')).data.status as DocStatus;
}

function routable(community: string, slug: string): boolean {
  const status = statusOf(community, slug);
  return status !== null && isPublishable({ status });
}

/** Master communities that have a route in this environment. */
export function listRoutableCommunities(): string[] {
  return listCommunities().filter((community) => routable(community, community));
}

/**
 * Neighborhoods that have a route here. A Neighborhood's page links up to its
 * master page in the breadcrumb and the text, so it has no route while the
 * master page has none.
 */
export function listRoutableNeighborhoods(): { community: string; neighborhood: string }[] {
  return listRoutableCommunities().flatMap((community) =>
    listNeighborhoods(community)
      .filter((neighborhood) => routable(community, neighborhood))
      .map((neighborhood) => ({ community, neighborhood })),
  );
}

/** The card and quick-fact rows are written as `[term, detail]` pairs, as they read. */
function assertPairs(value: unknown, field: string, file: string): KeyFact[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${file}: ${field} must be a non-empty list of [term, detail] pairs.`);
  }
  return value.map((row, index) => {
    const [term, detail] = Array.isArray(row) ? row : [];
    if (typeof term !== 'string' || typeof detail !== 'string' || !term.trim() || !detail.trim()) {
      throw new Error(`${file}: ${field}[${index}] must be a [term, detail] pair of non-empty strings.`);
    }
    return { term: term.trim(), detail: detail.trim() };
  });
}

function assertOthers(value: unknown, file: string): OtherNeighborhood[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${file}: others must be a list of { name, note }.`);
  return value.map((entry, index) => {
    const other = entry as { name?: unknown; note?: unknown };
    if (typeof other?.name !== 'string' || typeof other.note !== 'string') {
      throw new Error(`${file}: others[${index}] must have a string name and note.`);
    }
    return { name: other.name.trim(), note: other.note.trim() };
  });
}

/** `/communities/<community>/<slug>` links written into a page's Markdown. */
const COMMUNITY_LINK = /\]\(\/communities\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?(?:#[^)]*)?\)/g;

/**
 * A page's links to other community pages, checked against the files.
 *
 * A link to a page that does not exist is a 404 whatever the page's status. A
 * reviewed page linking to a draft is a 404 on the public site, where the draft
 * has no route, so a reviewed page may link only to reviewed pages.
 */
function assertLinks(status: DocStatus, raw: string, file: string): void {
  for (const match of raw.matchAll(COMMUNITY_LINK)) {
    const [, community, slug] = match;
    const target = slug ?? community;
    const targetStatus = statusOf(community, target);
    if (targetStatus === null) {
      throw new Error(`${file}: links to ${communityPath(community, target)}, which has no file.`);
    }
    if (status === 'reviewed' && targetStatus !== 'reviewed') {
      throw new Error(
        `${file}: a reviewed page links to ${communityPath(community, target)}, which is a draft ` +
          'and has no route on the public site.',
      );
    }
  }
}

function assertFrontMatter(
  data: Record<string, unknown>,
  body: string,
  file: string,
  community: string,
  slug: string,
): CommunityFrontMatter {
  const missing = REQUIRED.filter((field) => data[field] === undefined);
  if (missing.length > 0) {
    throw new Error(`${file}: missing required front-matter: ${missing.join(', ')}`);
  }

  const status = data.status as DocStatus;
  if (status !== 'draft' && status !== 'reviewed') {
    throw new Error(`${file}: status must be "draft" or "reviewed", got "${String(status)}".`);
  }

  const kind = data.kind as CommunityKind;
  const expectedKind: CommunityKind = slug === community ? 'master' : 'neighborhood';
  if (kind !== expectedKind) {
    throw new Error(`${file}: kind must be "${expectedKind}" for this file, got "${String(kind)}".`);
  }

  if (data.slug !== slug) {
    throw new Error(`${file}: front-matter slug "${String(data.slug)}" does not match its file.`);
  }

  const atAGlance = assertPairs(data.at_a_glance, 'at_a_glance', file);
  const related = (data.related as string[] | undefined) ?? [];
  const others = assertOthers(data.others, file);
  if (kind === 'neighborhood' && others.length > 0) {
    throw new Error(`${file}: only a master page lists other Neighborhoods.`);
  }
  for (const entry of related) {
    if (entry === slug || !fs.existsSync(fileFor(community, entry)) || entry === community) {
      throw new Error(`${file}: related "${entry}" is not another Neighborhood in ${community}.`);
    }
  }

  const answerWords = countWords(String(data.direct_answer));
  if (answerWords < 25) {
    throw new Error(`${file}: direct_answer is ${answerWords} words. It must stand alone at 40-60 words.`);
  }

  const pending = (data.pending_confirmation as string[] | undefined) ?? [];

  if (status === 'reviewed') {
    const missingReview = REVIEWED_ONLY.filter((field) => data[field] === undefined);
    if (missingReview.length > 0) {
      throw new Error(
        `${file}: a reviewed page must name its reviewer and dates. Missing: ${missingReview.join(', ')}`,
      );
    }
    const unresolved = findVerifyFlags(flaggable(data, atAGlance, body));
    if (unresolved.length > 0) {
      throw new Error(
        `${file}: status is "reviewed" but ${unresolved.length} VERIFY flag(s) remain: ` +
          `${unresolved.join('; ')}. Resolve them or set status: draft.`,
      );
    }
    if (pending.length > 0) {
      throw new Error(
        `${file}: status is "reviewed" but ${pending.length} drafted fact(s) are still ` +
          `unconfirmed: ${pending.join('; ')}. Confirm them and empty pending_confirmation, ` +
          'or set status: draft.',
      );
    }
  }

  assertLinks(status, body, file);

  return {
    ...(data as unknown as CommunityFrontMatter),
    documents_through: String(data.documents_through),
    cities: (data.cities as string[] | undefined) ?? [],
    at_a_glance: atAGlance,
    related,
    others,
    pending_confirmation: pending,
  };
}

/** Everything a reader sees that a flag can be written into. */
function flaggable(data: Record<string, unknown>, facts: KeyFact[], body: string): string {
  const others = Array.isArray(data.others) ? (data.others as OtherNeighborhood[]) : [];
  return [
    String(data.direct_answer ?? ''),
    String(data.association ?? ''),
    String(data.headline ?? ''),
    ...facts.map((fact) => `${fact.term} ${fact.detail}`),
    ...others.map((other) => `${other.name} ${other.note}`),
    body,
  ].join('\n');
}

export async function getCommunity(community: string, slug: string = community): Promise<Community | null> {
  const file = fileFor(community, slug);
  if (!fs.existsSync(file)) return null;

  const relative = path.relative(process.cwd(), file);
  const { data, content } = matter(fs.readFileSync(file, 'utf8'));
  const frontMatter = assertFrontMatter(data, content, relative, community, slug);

  return {
    ...frontMatter,
    at_a_glance: await renderFacts(frontMatter.at_a_glance),
    community,
    path: communityPath(community, slug),
    sections: await splitSections(content, relative),
    faq: await renderFaq(content),
    raw: content,
    verifyFlags: findVerifyFlags(flaggable(data, frontMatter.at_a_glance, content)),
    wordCount: countWords(content),
  };
}

/** A community's Neighborhood pages that are publishable here, by name. */
export async function getNeighborhoods(community: string): Promise<Community[]> {
  const pages = await Promise.all(listNeighborhoods(community).map((slug) => getCommunity(community, slug)));
  return pages
    .filter((page): page is Community => page !== null && isPublishable(page))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Resolves a page's `related` slugs to publishable pages. */
export async function getRelatedNeighborhoods(page: Community): Promise<Community[]> {
  const pages = await Promise.all(page.related.map((slug) => getCommunity(page.community, slug)));
  return pages.filter((entry): entry is Community => entry !== null && isPublishable(entry));
}

/** Every publishable page, master and Neighborhood, for the sitemap and llms.txt. */
export async function getAllCommunityPages(): Promise<Community[]> {
  const pages: Community[] = [];
  for (const community of listRoutableCommunities()) {
    const master = await getCommunity(community);
    if (master) pages.push(master);
    pages.push(...(await getNeighborhoods(community)));
  }
  return pages;
}

/** Rendered HTML for a short Markdown line — a card's summary, an "other" note. */
export async function renderLine(markdown: string): Promise<string> {
  const html = (await toHtml(markdown)).trim();
  const single = /^<p>([\s\S]*)<\/p>$/.exec(html);
  return (single ? single[1] : html).trim();
}
