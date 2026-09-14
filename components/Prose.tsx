import { formatLongDate } from '@/lib/seo';

/** Marks `[VERIFY: ...]` flags in rendered HTML so they read as flags, not copy. */
function markVerifyFlags(html: string): string {
  return html.replace(
    /\[VERIFY:?([^\]]*)\]/g,
    (_match, note: string) =>
      `<span class="verify-inline">VERIFY${note.trim() ? `: ${note.trim()}` : ''}</span>`,
  );
}

export function Prose({ html }: { html: string }) {
  return (
    <div
      className="prose"
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
}: {
  flags: string[];
  variant?: 'flagged' | 'withheld';
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
            {flags.length} item{plural} we have not published for this county
          </strong>
          These are not stated anywhere on this page. We publish a figure once it is tied to a
          source we are willing to stand behind, and none of these is there yet — an invented
          closing cost is worse than a missing one. Ask us on a specific file and we will tell you
          what we are seeing.
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
}: {
  authorName: string;
  authorRole: string;
  credential: string | null;
  reviewedOn: string;
  nextReview: string;
}) {
  return (
    <div className="byline">
      Reviewed by <strong>{authorName}</strong>, {authorRole}
      {credential ? `, ${credential}` : ''}.
      <br />
      Reviewed {formatLongDate(reviewedOn)}. Next scheduled review {formatLongDate(nextReview)}.
      <br />
      Florida title practice changes. If a fee, form or timeline on this page no longer matches what
      you are seeing, tell us and we will correct it.
    </div>
  );
}
