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
 * 2. Retention. Section 7 describes the practice honestly — kept as long as
 *    needed and as long as the law requires — because no schedule has ever
 *    been set. A definite one would be better, and it is the same decision
 *    that is still outstanding for uploaded order documents.
 *
 * The SMS section is compliance text, not copy. Carriers require terms of that
 * shape to be publicly posted for an A2P messaging registration, and the old
 * page was cited as both the privacy policy and the SMS terms of service.
 * Check with whoever manages that registration before changing its wording.
 */
export const PRIVACY_EFFECTIVE_DATE = '2026-09-14';

/**
 * Whether the policy may be served, linked in the footer and listed in the
 * sitemap. Kept as a named export so the page, the footer and the sitemap
 * cannot disagree about whether the policy exists.
 */
export const PRIVACY_PUBLISHED = true;
