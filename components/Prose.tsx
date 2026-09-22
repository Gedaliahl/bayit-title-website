import { formatLongDate } from '@/lib/seo';

/** Marks `[VERIFY: ...]` flags in rendered HTML so they read as flags, not copy. */
export function markVerifyFlags(html: string): string {
  return html.replace(
    /\[VERIFY:?([^\]]*)\]/g,
    (_match, note: string) =>
      `<span class="verify-inline">VERIFY${note.trim() ? `: ${note.trim()}` : ''}</span>`,
  );
}

/**
 * Rendered Markdown.
 *
 * `library` is the reading column a whole page body is set in. `detail` is one
 * section of that body, rendered on its own beside the contents rail: wider,
 * and without the rule its headings carry in the library layout, because there
 * the template draws the rule between sections instead.
 */
export function Prose({ html, variant = 'library' }: { html: string; variant?: 'library' | 'detail' }) {
  if (!html.trim()) return null;

  return (
    <div
      className={variant === 'detail' ? 'prose prose--detail' : 'prose'}
      // Markdown authored in this repo and reviewed before merge.
      dangerouslySetInnerHTML={{ __html: markVerifyFlags(html) }}
    />
  );
}

/**
 * Plain text — a quick fact, the direct answer — with any `[VERIFY: ...]` flag
 * marked the same way the body marks one. The banner counts flags wherever
 * they are written, so they have to read as flags wherever they are shown.
 */
export function VerifyText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[VERIFY:?[^\]]*\])/g).map((part, index) => {
        const flag = /^\[VERIFY:?([^\]]*)\]$/.exec(part);
        if (!flag) return part;

        const note = flag[1].trim();
        return (
          <span className="verify-inline" key={index}>
            {`VERIFY${note ? `: ${note}` : ''}`}
          </span>
        );
      })}
    </>
  );
}

/**
 * One line of a quick-facts box or a verdict row.
 *
 * Front-matter carries Markdown, so where the line has been rendered the
 * rendered version is what the reader sees — otherwise a statute citation shows
 * as `[Fla. Stat. § 55.03](https://…)`. Plain text is still handled, so a fact
 * assembled in a page rather than read off a file needs no rendering step.
 */
export function FactDetail({ fact }: { fact: { detail: string; html?: string } }) {
  if (!fact.html) return <VerifyText text={fact.detail} />;

  return (
    <span
      // Markdown authored in this repo's front-matter and reviewed before merge.
      dangerouslySetInnerHTML={{ __html: markVerifyFlags(fact.html) }}
    />
  );
}

export function AnswerPanel({ text }: { text: string }) {
  return (
    <div className="answer-panel">
      <p className="answer-panel__label">The short answer</p>
      <p className="answer-panel__text">
        <VerifyText text={text} />
      </p>
    </div>
  );
}

/**
 * Unresolved facts, listed at the top of the page.
 *
 * This is intentionally loud and intentionally public. A page with honest gaps
 * is useful; a page with confident fabrications is a professional liability.
 *
 * Two shapes, because two different things are being declared:
 *
 * - `flagged` — the page carries `[VERIFY: ...]` marks in its copy and this
 *   banner collects them. The reader can find each one in context.
 * - `withheld` — the page has no marks because the facts are simply not on it,
 *   held back until each is tied to a source. Pointing such a reader at "what
 *   is marked VERIFY below" sends them looking for a word that never appears.
 */
export function VerifyBanner({
  flags,
  variant = 'flagged',
  scope = 'county',
}: {
  flags: string[];
  variant?: 'flagged' | 'withheld';
  /** What the withheld facts are about, for the banner's first line. */
  scope?: 'county' | 'city';
}) {
  if (flags.length === 0) return null;

  const plural = flags.length === 1 ? '' : 's';

  return (
    <div className="verify-banner" role="note">
      {variant === 'flagged' ? (
        <>
          <strong>
            {flags.length} item{plural} on this page await{flags.length === 1 ? 's' : ''} licensed
            review
          </strong>
          Each one is marked VERIFY where it belongs in the text below. Nothing carrying that mark
          has been confirmed by a licensed title agent. Treat those points as open questions, not as
          statements of Florida law or of our practice.
        </>
      ) : (
        <>
          <strong>
            {flags.length} item{plural} we have not published for this {scope}
          </strong>
          {flags.length === 1 ? 'It is not stated' : 'These are not stated'} anywhere on this page.
          We publish a figure once it is tied to a source we are willing to stand behind, and{' '}
          {flags.length === 1 ? 'this one is not there yet' : 'none of these is there yet'} — an
          invented closing cost is worse than a missing one. Ask us on a specific file and we will
          tell you what we are seeing.
        </>
      )}
      <ul>
        {flags.map((flag, index) => (
          <li key={`${flag}-${index}`}>{flag}</li>
        ))}
      </ul>
    </div>
  );
}

export function Byline({
  authorName,
  authorRole,
  credential,
  reviewedOn,
  nextReview,
  withAvatar = false,
}: {
  authorName: string;
  authorRole: string;
  credential: string | null;
  reviewedOn: string;
  nextReview: string;
  /** Initials disc beside the credit, for the interior article template. */
  withAvatar?: boolean;
}) {
  const body = (
    <>
      Reviewed by <strong>{authorName}</strong>, {authorRole}
      {credential ? `, ${credential}` : ''}.
      <br />
      Reviewed {formatLongDate(reviewedOn)}. Next scheduled review {formatLongDate(nextReview)}.
      <br />
      Florida title practice changes. If a fee, form or timeline on this page no longer matches what
      you are seeing, tell us and we will correct it.
    </>
  );

  if (!withAvatar) return <div className="byline">{body}</div>;

  return (
    <div className="byline byline--avatar">
      <span className="avatar" aria-hidden="true">
        {initials(authorName)}
      </span>
      <p>{body}</p>
    </div>
  );
}

/** First letters of the first and last name — the disc is decorative either way. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return `${first}${last}`.toUpperCase();
}
