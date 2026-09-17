import type { MetadataRoute } from 'next';
import { SITE_URL, indexingAllowed } from '@/lib/seo';

// AI crawlers are explicitly allowed. Being quotable by an assistant is a
// primary goal of this site, not a side effect — see HANDOFF.md.
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Bingbot',
  'CCBot',
  'Meta-ExternalAgent',
  'cohere-ai',
  'DuckAssistBot',
  'Amazonbot',
  'YouBot',
];

export default function robots(): MetadataRoute.Robots {
  // A deployment that is not answering for the canonical domain is a duplicate
  // of the site it will replace. It is closed to everything, and names no
  // sitemap: pointing crawlers at a full list of the duplicate's URLs is the
  // opposite of what this is for.
  if (!indexingAllowed()) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      // The API routes accept form submissions and have nothing to index.
      { userAgent: '*', allow: '/', disallow: ['/api/'] },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: '/', disallow: ['/api/'] })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
