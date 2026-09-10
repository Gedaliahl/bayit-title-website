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

export function AnswerPanel({ text }: { text: string }) {
  return (
    <div className="answer-panel">
      <p className="answer-panel__label">The short answer</p>
      <p className="answer-panel__text">{text}</p>
    </div>
  );
}

/**
 * Unresolved facts, listed at the top of the page.
 *
 * This is intentionally loud and intentionally public. A page with honest gaps
 * is useful; a page with confident fabrications is a professional liability.
 */
export function VerifyBanner({ flags }: { flags: string[] }) {
  if (flags.length === 0) return null;

  return (
    <div className="verify-banner" role="note">
      <strong>
        {flags.length} item{flags.length === 1 ? '' : 's'} on this page await licensed review
      </strong>
      Nothing below marked VERIFY has been confirmed by a licensed title agent. Treat those points
      as open questions, not as statements of Florida law or of our practice.
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
