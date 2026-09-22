/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === 'development';

/**
 * The browser talks to Supabase Storage directly — and only there.
 *
 * An order's documents are PUT straight to the private bucket with a signed
 * URL, so `connect-src 'self'` alone would block every upload. The origin is
 * read from the same variable the server client uses, so the policy cannot
 * drift from the project the app is actually pointed at.
 */
function storageOrigin() {
  const url = process.env.SUPABASE_URL?.trim();

  if (!url) {
    // Same reasoning as lib/supabase.ts: a misconfigured build that renders
    // normally is worse than a noisy one. Without this the site looks fine and
    // only document upload is broken, at the least convenient moment.
    console.warn(
      '[csp] SUPABASE_URL is unset, so connect-src will not allow the storage ' +
        'bucket. Order document uploads will be blocked by the browser.',
    );
    return null;
  }

  try {
    return new URL(url).origin;
  } catch {
    console.warn(`[csp] SUPABASE_URL is not a valid URL; leaving it out of connect-src.`);
    return null;
  }
}

/**
 * Content-Security-Policy.
 *
 * `script-src` carries 'unsafe-inline' and that is a deliberate trade, not an
 * oversight. Next emits two inline bootstrap scripts per page, and the JSON-LD
 * this site exists to publish is inline by definition. The alternative is a
 * per-request nonce, which requires middleware and opts every page out of
 * static rendering — a real cost on a site whose whole shape is statically
 * generated content pages served from the edge.
 *
 * What the policy still buys with 'unsafe-inline' in place is worth having: an
 * injected `<script src>` pointing at an attacker's host is refused, so is an
 * injected form posting somewhere else, so is a rewritten <base>, and the list
 * of origins the page may talk to at all is closed. Markdown is rendered with
 * `sanitize: false`, so that last part is not theoretical — it is the backstop
 * if a content file ever carries something it should not.
 */
function contentSecurityPolicy() {
  const storage = storageOrigin();
  // Cloudflare Turnstile, only when its site key is set (lib/submissions.ts).
  // Its script draws the check inside a frame served from the same host, so
  // the one origin opens both. Unset, the policy is exactly what it was.
  const turnstile = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()
    ? 'https://challenges.cloudflare.com'
    : null;

  const directives = {
    'default-src': ["'self'"],
    // Vercel's analytics scripts are same-origin, under /_vercel/.
    'script-src': ["'self'", "'unsafe-inline'", turnstile, isDev ? "'unsafe-eval'" : null],
    // JSX style attributes, of which the pages carry a handful.
    'style-src': ["'self'", "'unsafe-inline'"],
    // next/font self-hosts, so no font CDN is needed.
    'font-src': ["'self'"],
    'img-src': ["'self'", 'data:'],
    'connect-src': ["'self'", storage, isDev ? 'ws:' : null],
    'form-action': ["'self'"],
    // Matches X-Frame-Options below; the two must not disagree.
    'frame-ancestors': ["'self'"],
    'frame-src': turnstile ? [turnstile] : ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'none'"],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
  };

  const policy = Object.entries(directives)
    .map(([name, values]) => `${name} ${values.filter(Boolean).join(' ')}`)
    .join('; ');

  // No mixed content, and nothing to upgrade over http in development.
  return isDev ? policy : `${policy}; upgrade-insecure-requests`;
}

/**
 * The canonical origin, which lib/site.ts states with its reason. It is
 * repeated here only because this file cannot import TypeScript;
 * tests/redirects.test.ts fails if the two ever disagree.
 */
export const CANONICAL_ORIGIN = 'https://bayittitle.com';

/**
 * A production deployment answers on the firm's domain and also on its
 * *.vercel.app aliases. Once the build is open to crawlers (lib/seo.ts), each
 * alias is a complete indexable copy of the site, so in production every one of
 * them is sent to the real domain. A preview is a different build with
 * VERCEL_ENV=preview, so this never reaches one, and previews stay where they
 * are, closed to crawlers.
 *
 * `/api/` is left alone. Vercel calls the purge cron on the deployment itself,
 * and a redirect would turn that call into a 308 that nothing follows.
 */
function productionAliasRedirects() {
  if (process.env.VERCEL_ENV !== 'production') return [];

  return [
    {
      source: '/:path((?!api/).*)',
      has: [{ type: 'host', value: '(?<alias>.+)\\.vercel\\.app' }],
      destination: `${CANONICAL_ORIGIN}/:path`,
      permanent: true,
    },
  ];
}

const nextConfig = {
  reactStrictMode: true,

  /**
   * Legacy Wix URLs.
   *
   * Every source below was checked against the live site rather than guessed
   * at. The list it replaces was a first pass at Wix naming conventions, and
   * seven of its nine entries redirected paths that had never existed while six
   * real pages had no redirect at all and would have 404ed at cutover.
   *
   * The authority is https://www.bayittitle.com/pages-sitemap.xml. That lists
   * what Wix currently publishes, which is a floor rather than a ceiling: a URL
   * deleted years ago can still sit in Google's index with links pointing at
   * it. Search Console's Pages report on the Wix property is the only place
   * those show up, so re-check this list against it before the cutover.
   *
   * Destinations are chosen to match what the old page was about. An off-topic
   * redirect is treated as a soft 404 and passes nothing, so sending everything
   * to the homepage would throw away exactly what these exist to preserve.
   *
   * `/about` is deliberately absent: the path is the same on both sites.
   */
  async redirects() {
    return [
      ...productionAliasRedirects(),

      // Live on Wix today, verified 200.
      { source: '/home', destination: '/', permanent: true },
      { source: '/contact-us', destination: '/contact', permanent: true },
      { source: '/order-title', destination: '/order', permanent: true },
      { source: '/process', destination: '/services', permanent: true },
      { source: '/titleinsurance', destination: '/services', permanent: true },
      // /rates was the Wix page for the title insurance rates. The title
      // insurance calculator is the page that answers it now — the promulgated
      // schedule in full, the premium at common prices and the calculator
      // itself, each cited to the rule — so the redirect follows the topic
      // rather than the form it used to land on.
      { source: '/rates', destination: '/closing-costs/title-insurance-calculator', permanent: true },

      // The premium calculator had its own page here, then lived inside the
      // estimate page, and has its own page again. Its links live on in the
      // index and in other people's pages, and land on the same tool.
      { source: '/calculator', destination: '/closing-costs/title-insurance-calculator', permanent: true },

      // 404 on Wix today, so they are already gone. Kept because the handoff
      // records that the old site carried Pennsylvania pages, which means they
      // may still be indexed with links pointing at them. The firm is licensed
      // in Florida only, so a stale PA page must not resurface and must not
      // land on a 404 either.
      { source: '/pennsylvania', destination: '/', permanent: true },
      { source: '/pa-closings', destination: '/', permanent: true },
      { source: '/pennsylvania-title-insurance', destination: '/', permanent: true },

      // Wix published the policy at two paths, which is its usual duplication.
      // /privacy is the page here; /privacy-policy folds into it. Both depend on
      // app/privacy/page.tsx being reviewed — until then it is a draft and does
      // not render in production, so review it before the cutover.
      { source: '/privacy-policy', destination: '/privacy', permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy() },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Kept alongside frame-ancestors for browsers that predate CSP 2.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
