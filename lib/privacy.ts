/**
 * The website's privacy policy, and the date it took effect.
 *
 * The page is live. It carries over every substantive commitment from the two
 * policies that ran on the Wix site — /privacy, effective 17 April 2026, and
 * /privacy-policy, last updated 15 March 2026 — into one page, so there is no
 * longer a pair of documents free to drift apart.
 *
 * **It has not been through a lawyer.** Nothing on the page is invented: the
 * parts describing the website are written from the code, and the rest is the
 * old policy's own language. But a privacy policy is a binding representation
 * by a licensed financial institution, and two things in particular deserve
 * counsel's eye before anyone treats this as settled:
 *
 * 1. Whether the agency needs a separate Gramm-Leach-Bliley notice for the
 *    closing side. A title agency is a financial institution under GLBA, and
 *    this page is scoped to the website.
 * 2. Retention. Section 7 describes the practice — kept as long as needed and
 *    as long as the law requires — and states no schedule and no promise to
 *    delete, on the firm's instruction of 22 September 2026. The website's
 *    storage has a purge (app/api/cron/purge) that runs only once CRON_SECRET
 *    is set; whether to switch it on, and at what ages, is the firm's and its
 *    counsel's call, and nothing on the site depends on it.
 *
 * The SMS section is compliance text, not copy. Carriers require terms of that
 * shape to be publicly posted for an A2P messaging registration, and the old
 * page was cited as both the privacy policy and the SMS terms of service.
 * Check with whoever manages that registration before changing its wording.
 */
export const PRIVACY_EFFECTIVE_DATE = '2026-09-22';

/**
 * Whether the policy may be served, linked in the footer and listed in the
 * sitemap. Kept as a named export so the page, the footer and the sitemap
 * cannot disagree about whether the policy exists.
 */
export const PRIVACY_PUBLISHED = true;
