// Tells Bing, and through IndexNow every engine that shares it (Yandex,
// Seznam, Naver), which pages are new or changed, so they are crawled on the
// day they publish rather than whenever a crawler next passes by. Bing's index
// is also the one several AI assistants search.
//
//   npm run indexnow                 new and re-dated URLs since the last run
//   INDEXNOW_ALL=1 npm run indexnow  every URL in the sitemap
//
// Run by .github/workflows/indexnow.yml after each production deploy passes
// the Live SEO check. The sitemap it saw is kept in INDEXNOW_STATE between
// runs, so each run submits only what changed: a URL that is new, or whose
// <lastmod> moved. The protocol asks for exactly that, and a first run with no
// saved state submits all.
//
// The key is public by design. The engines prove the submitter controls the
// host by fetching it from /<key>.txt, which is public/<key>.txt here.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { CANONICAL_ORIGIN } from '../next.config.mjs';

const ORIGIN = (process.env.LIVE_ORIGIN || CANONICAL_ORIGIN).replace(/\/$/, '');
const STATE = process.env.INDEXNOW_STATE || '.indexnow/sitemap.json';
const ENDPOINT = 'https://api.indexnow.org/indexnow';

const keyFile = readdirSync(new URL('../public/', import.meta.url)).find((name) => /^[0-9a-f]{32}\.txt$/.test(name));
if (!keyFile) throw new Error('No IndexNow key file in public/.');
const key = keyFile.replace(/\.txt$/, '');

async function liveSitemap() {
  const response = await fetch(`${ORIGIN}/sitemap.xml`, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`sitemap.xml answered ${response.status}`);
  const xml = await response.text();
  const entries = {};
  for (const [, block] of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = block.match(/<loc>\s*([^<\s]+)\s*<\/loc>/)?.[1];
    if (loc) entries[loc] = block.match(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/)?.[1] ?? null;
  }
  return entries;
}

async function main() {
  const current = await liveSitemap();
  const previous = !process.env.INDEXNOW_ALL && existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : null;

  const changed = Object.keys(current).filter(
    (url) => !previous || !(url in previous) || previous[url] !== current[url],
  );

  if (changed.length === 0) {
    console.log('IndexNow: nothing new or re-dated in the sitemap.');
  } else {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: new URL(ORIGIN).host,
        key,
        keyLocation: `${ORIGIN}/${keyFile}`,
        urlList: changed,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    // 200 and 202 are both acceptance; 202 means the key is still being checked.
    if (response.status !== 200 && response.status !== 202) {
      throw new Error(`IndexNow answered ${response.status}: ${await response.text()}`);
    }
    console.log(`IndexNow: submitted ${changed.length} URL${changed.length === 1 ? '' : 's'} (${response.status}).`);
    for (const url of changed) console.log(`  ${url}`);
  }

  mkdirSync(dirname(STATE), { recursive: true });
  writeFileSync(STATE, JSON.stringify(current, null, 2));
}

await main();
