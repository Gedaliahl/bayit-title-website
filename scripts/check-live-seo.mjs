// Whether the live site is open to search engines, checked the way a crawler
// meets it rather than the way the code intends it.
//
// On 22 September 2026 the real domain went out with `Disallow: /` in
// robots.txt and `noindex, nofollow` on every page, while every unit test
// passed: the gate was right about every environment the tests described and
// wrong about the one Vercel actually provided. Nothing in the build can see
// that. Only a request to the live host can, so this makes that request.
//
//   npm run check:live                     checks https://bayittitle.com
//   LIVE_ORIGIN=https://… npm run check:live
//
// Exits non-zero, listing every problem, when:
// - robots.txt closes the site, or names a sitemap on another host;
// - the other of the domain's two hosts does not redirect to the canonical one;
// - any page in the sitemap fails to answer 200, carries noindex (in a meta tag
//   or a header), or names a canonical other than its own URL;
// - the sitemap is missing, lists a URL on another host, or has shrunk below
//   what the site publishes (a build without its county data ships a sixth of
//   the county pages and would otherwise pass).

import { CANONICAL_ORIGIN } from '../next.config.mjs';

const ORIGIN = (process.env.LIVE_ORIGIN || CANONICAL_ORIGIN).replace(/\/$/, '');
const HOST = new URL(ORIGIN).host;
const OTHER_HOST = HOST.startsWith('www.') ? HOST.slice(4) : `www.${HOST}`;

/** Fewer than this many URLs in the sitemap means a build shipped without its data. */
const MIN_SITEMAP_URLS = Number(process.env.MIN_SITEMAP_URLS || 50);
const CONCURRENCY = 4;
const TIMEOUT_MS = 20_000;
const USER_AGENT = 'bayittitle.com live SEO check (+https://github.com/Gedaliahl/bayit-title-website)';

const problems = [];
const problem = (message) => problems.push(message);

async function get(url, { redirect = 'follow' } = {}) {
  let lastError;
  // One retry: a single dropped connection is the network, two is the site.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await fetch(url, {
        redirect,
        headers: { 'user-agent': USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

/** The value of one attribute on the first tag matching `pattern`, in whichever order the attributes come. */
function attribute(html, tagPattern, name) {
  const tag = html.match(tagPattern)?.[0];
  if (!tag) return null;
  return tag.match(new RegExp(`${name}=["']([^"']*)["']`, 'i'))?.[1] ?? null;
}

function robotsMeta(html) {
  const tags = html.match(/<meta[^>]+name=["'](robots|googlebot)["'][^>]*>/gi) ?? [];
  return tags.map((tag) => tag.match(/content=["']([^"']*)["']/i)?.[1] ?? '').join(', ');
}

/** Groups robots.txt into user-agent blocks and reports whether `*` is shut out. */
function robotsClosesSite(text) {
  const blocks = [];
  let current = null;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*/, '').trim();
    const [field, ...rest] = line.split(':');
    const value = rest.join(':').trim();
    if (!field) continue;
    if (/^user-agent$/i.test(field)) {
      if (!current || current.rules.length > 0) blocks.push((current = { agents: [], rules: [] }));
      current.agents.push(value);
    } else if (current && /^(allow|disallow)$/i.test(field)) {
      current.rules.push({ field: field.toLowerCase(), value });
    }
  }
  const star = blocks.find((block) => block.agents.includes('*'));
  if (!star) return false;
  const closed = star.rules.some((rule) => rule.field === 'disallow' && rule.value === '/');
  const reopened = star.rules.some((rule) => rule.field === 'allow' && rule.value === '/');
  return closed && !reopened;
}

async function checkRobots() {
  const response = await get(`${ORIGIN}/robots.txt`);
  if (response.status !== 200) return problem(`robots.txt answered ${response.status}`);

  const text = await response.text();
  if (robotsClosesSite(text)) problem('robots.txt disallows the whole site for User-agent: *');

  const sitemaps = [...text.matchAll(/^sitemap:\s*(\S+)/gim)].map((match) => match[1]);
  if (sitemaps.length === 0) problem('robots.txt names no sitemap');
  for (const sitemap of sitemaps) {
    if (new URL(sitemap).host !== HOST) problem(`robots.txt names a sitemap on another host: ${sitemap}`);
  }
}

async function checkOtherHost() {
  const response = await get(`https://${OTHER_HOST}/`, { redirect: 'manual' });
  const location = response.headers.get('location');
  if (![301, 308].includes(response.status) || !location || new URL(location, `https://${OTHER_HOST}`).host !== HOST) {
    problem(
      `https://${OTHER_HOST}/ should permanently redirect to ${ORIGIN}/, ` +
        `but answered ${response.status}${location ? ` → ${location}` : ''}. ` +
        'If the primary domain was switched in Vercel, change site.url and CANONICAL_ORIGIN to match.',
    );
  }
}

async function sitemapUrls() {
  const response = await get(`${ORIGIN}/sitemap.xml`);
  if (response.status !== 200) {
    problem(`sitemap.xml answered ${response.status}`);
    return [];
  }
  const urls = [...(await response.text()).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((match) => match[1]);
  if (urls.length < MIN_SITEMAP_URLS) {
    problem(`sitemap.xml lists ${urls.length} URLs, fewer than the ${MIN_SITEMAP_URLS} the site publishes`);
  }
  for (const url of urls) {
    if (new URL(url).host !== HOST) problem(`sitemap.xml lists a URL on another host: ${url}`);
  }
  return urls;
}

async function checkPage(url) {
  // Manual, so a page that has started redirecting is reported rather than
  // quietly followed to wherever it now lands.
  const response = await get(url, { redirect: 'manual' });
  if (response.status !== 200) {
    const location = response.headers.get('location');
    return problem(`${url} answered ${response.status}${location ? ` → ${location}` : ''}`);
  }

  const header = response.headers.get('x-robots-tag') ?? '';
  if (/noindex/i.test(header)) problem(`${url} sends X-Robots-Tag: ${header}`);

  const html = await response.text();
  const meta = robotsMeta(html);
  if (/noindex/i.test(meta)) problem(`${url} carries robots meta "${meta}"`);

  const canonical = attribute(html, /<link[^>]+rel=["']canonical["'][^>]*>/i, 'href');
  if (!canonical) return problem(`${url} has no canonical`);

  const normalise = (value) => new URL(value, ORIGIN).href.replace(/\/$/, '');
  if (normalise(canonical) !== normalise(url)) problem(`${url} names ${canonical} as its canonical`);
}

async function inBatches(items, worker) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        try {
          await worker(item);
        } catch (error) {
          problem(`${item}: ${error.cause?.code ?? error.message}`);
        }
      }
    }),
  );
}

async function main() {
  console.log(`Checking ${ORIGIN} as a crawler would.`);

  await Promise.all([
    checkRobots().catch((error) => problem(`robots.txt: ${error.message}`)),
    checkOtherHost().catch((error) => problem(`https://${OTHER_HOST}/: ${error.message}`)),
  ]);

  const urls = await sitemapUrls().catch((error) => {
    problem(`sitemap.xml: ${error.message}`);
    return [];
  });
  await inBatches(urls, checkPage);

  if (problems.length > 0) {
    console.error(`\n${problems.length} problem${problems.length === 1 ? '' : 's'}:`);
    for (const message of problems) console.error(`  - ${message}`);
    process.exit(1);
  }

  console.log(`OK: robots.txt open, ${OTHER_HOST} redirects, and all ${urls.length} sitemap URLs are indexable.`);
}

await main();
