/**
 * Publication state of the privacy policy.
 *
 * It lives here rather than in the page because three places have to agree on
 * it: the page itself, the footer link, and the sitemap. A policy that is
 * linked but 404s, or listed for crawlers while unreviewed, is worse than one
 * that is not there yet.
 *
 * A privacy policy is a binding representation by a licensed financial
 * institution, so it gets the same gate as every other page that says something
 * a regulator could read. Flip this to 'reviewed' once a licensed person and
 * counsel have been through `app/privacy/page.tsx` and every VERIFY on it has
 * been resolved.
 */
import { isPublishable } from './content';

export const PRIVACY_STATUS = 'draft' as const;

/** True when the policy may be linked, listed and served to the public. */
export const PRIVACY_PUBLISHED = isPublishable({ status: PRIVACY_STATUS });
