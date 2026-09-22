import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { APIRequestContext } from '@playwright/test';

export interface Route {
  path: string;
  /** What the server must answer: 200, or 404 for the addresses that must not exist. */
  status: 200 | 404;
}

/**
 * A draft's address, which production must answer with a 404. Read off
 * content/ rather than named here, so the check does not quietly lapse into
 * testing a live page when that draft is reviewed.
 */
export function draftPath(): string | null {
  for (const section of ['title-problems', 'services']) {
    const dir = path.join(process.cwd(), 'content', section);
    for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.md'))) {
      const { data } = matter(fs.readFileSync(path.join(dir, file), 'utf8'));
      if (data.status === 'draft') return `/${section}/${file.replace(/\.md$/, '')}`;
    }
  }
  return null;
}

/**
 * Every page the sitemap lists except the homepage, which is out of this
 * suite's scope, plus the two estimator modes the sitemap cannot express, an
 * address that was never a page, and a draft.
 *
 * The sitemap's URLs are absolute on the canonical host whatever server
 * answered, so only their paths are kept.
 */
export async function routes(request: APIRequestContext): Promise<Route[]> {
  const response = await request.get('/sitemap.xml');
  if (!response.ok()) throw new Error(`/sitemap.xml answered ${response.status()}`);
  const xml = await response.text();
  const listed = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => new URL(match[1]!).pathname)
    .filter((pathname) => pathname !== '/');

  const draft = draftPath();
  return [
    ...listed.map((pathname) => ({ path: pathname, status: 200 as const })),
    { path: '/estimate?mode=numbers', status: 200 },
    { path: '/estimate?mode=upload', status: 200 },
    { path: '/this-page-does-not-exist', status: 404 },
    ...(draft ? [{ path: draft, status: 404 as const }] : []),
  ];
}
