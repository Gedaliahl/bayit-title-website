/**
 * Every page's own metadata, read the way Next reads it: the page's `metadata`
 * export, or its `generateMetadata` for every slug `generateStaticParams`
 * lists, with the root layout's title template applied.
 *
 * These are the fields a search result is built from, and each has failed
 * silently before. A layout canonical made every page that forgot its own
 * point at the homepage; a layout og:url made every shared link show the home
 * card; titles ran to 106 characters and descriptions to about 390, and a
 * results page cuts both off wherever it likes.
 */
import fs from 'node:fs';
import path from 'node:path';

import type { Metadata } from 'next';
import { describe, expect, it } from 'vitest';

import { TITLE_TEMPLATE, TITLE_LIMIT } from '@/lib/seo';

/** A title can run a few characters past the target before a results page cuts it. */
const TITLE_CEILING = TITLE_LIMIT + 5;
const DESCRIPTION_LIMIT = 155;

/**
 * Library articles whose title is the reader's whole question, and too long
 * for a results page even without the site name. Each needs a shorter SEO title
 * of its own in the front matter; the headline on the page stays the question.
 * Listed rather than skipped, and checked below to still be too long, so the
 * list cannot quietly outlive the fix.
 */
const AWAITING_SEO_TITLE = new Set([
  '/title-problems/buying-property-bankruptcy-estate-florida',
  '/title-problems/hoa-approval-delay-closing-florida',
  '/title-problems/judgment-against-seller-before-closing-florida',
  '/title-problems/litigation-against-seller-flip-florida',
  '/title-problems/no-legal-access-landlocked-property-florida',
  '/title-problems/non-standard-purchase-contract-florida-closing',
  '/title-problems/open-permits-before-closing-florida',
]);

interface PageModule {
  metadata?: Metadata;
  generateMetadata?: (props: { params: Promise<Record<string, string>> }) => Promise<Metadata>;
  generateStaticParams?: () => Promise<Record<string, string>[]> | Record<string, string>[];
}

interface Route {
  path: string;
  metadata: Metadata;
}

function pageFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return pageFiles(full);
    return entry.name === 'page.tsx' ? [full] : [];
  });
}

async function routes(): Promise<Route[]> {
  const appDir = path.resolve(__dirname, '../app');
  const found: Route[] = [];

  for (const file of pageFiles(appDir)) {
    const pattern = `/${path.relative(appDir, path.dirname(file)).split(path.sep).join('/')}`.replace(/\/$/, '') || '/';
    const mod = (await import(file)) as PageModule;

    if (mod.generateMetadata) {
      const params = mod.generateStaticParams ? await mod.generateStaticParams() : [{}];
      for (const param of params) {
        const route = pattern.replace(/\[(\w+)\]/g, (_, key: string) => param[key]);
        found.push({ path: route, metadata: await mod.generateMetadata({ params: Promise.resolve(param) }) });
      }
    } else {
      found.push({ path: pattern, metadata: mod.metadata ?? {} });
    }
  }

  return found;
}

/**
 * The template applies to the layout's child segments only. The homepage is in
 * the layout's own segment, so its string title is printed as it stands.
 */
function resolvedTitle(route: string, title: Metadata['title']): string {
  if (typeof title === 'string') return route === '/' ? title : TITLE_TEMPLATE.replace('%s', title);
  if (title && 'absolute' in title && title.absolute) return title.absolute;
  throw new Error(`unresolvable title: ${JSON.stringify(title)}`);
}

const all = await routes();

describe('page metadata', () => {
  it('reads every page, generated ones included', () => {
    // A glob that silently matched nothing would pass every test below.
    expect(all.length).toBeGreaterThan(30);
    expect(all.map((route) => route.path)).toEqual(
      expect.arrayContaining(['/', '/about', '/estimate', '/counties/broward-county']),
    );
  });

  it.each(all.map((route) => [route.path, route.metadata] as const))(
    '%s names itself as its canonical',
    (route, metadata) => {
      expect(metadata.alternates?.canonical).toBe(route);
    },
  );

  it.each(all.map((route) => [route.path, route.metadata] as const))(
    '%s shares its own URL, with the site name and locale kept',
    (route, metadata) => {
      // The homepage inherits the layout's Open Graph block, which is correct
      // for it alone; it is checked for its canonical above.
      if (route === '/') return;
      expect(metadata.openGraph?.url).toBe(route);
      expect(metadata.openGraph).toMatchObject({ siteName: 'Bayit Title', locale: 'en_US' });
    },
  );

  it.each(all.map((route) => [route.path, route.metadata] as const))(
    '%s has a title a results page can show whole',
    (route, metadata) => {
      const length = resolvedTitle(route, metadata.title).length;
      if (AWAITING_SEO_TITLE.has(route)) {
        expect(length, 'fixed: take it off AWAITING_SEO_TITLE').toBeGreaterThan(TITLE_CEILING);
        return;
      }
      expect(length).toBeLessThanOrEqual(TITLE_CEILING);
    },
  );

  it.each(all.map((route) => [route.path, route.metadata] as const))(
    '%s has a description a results page can show whole',
    (route, metadata) => {
      // The homepage description carries the "excellence" wording, which is
      // waiting on the firm's decision (D3) and is not rewritten until then.
      if (route === '/') return;
      expect(typeof metadata.description).toBe('string');
      expect((metadata.description as string).length).toBeLessThanOrEqual(DESCRIPTION_LIMIT);
    },
  );
});
