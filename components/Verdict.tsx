import Link from 'next/link';

import type { KeyFact } from '@/lib/content';
import { FactDetail } from '@/components/Prose';

export interface VerdictAction {
  /** The line to the left of the button — a question, not a slogan. */
  prompt: string;
  label: string;
  href: string;
}

/**
 * The card beside the headline: the reader's first question, answered before
 * the page explains anything.
 *
 * It is a server component with no interactivity on purpose. This block is what
 * a search engine puts in a snippet and what an assistant quotes, so it has to
 * be in the first HTML the server sends rather than assembled in a browser.
 * The cap's headline is a `<p>`; the page's one `<h1>` is the question itself.
 */
export function Verdict({
  eyebrow,
  headline,
  rows,
  action,
  children,
}: {
  eyebrow: string;
  headline: string;
  rows?: KeyFact[];
  action?: VerdictAction;
  /** Link rows, where the card routes rather than answers. */
  children?: React.ReactNode;
}) {
  return (
    <div className="verdict">
      <div className="verdict__cap">
        <p className="verdict__eyebrow">{eyebrow}</p>
        <p className="verdict__headline">{headline}</p>
      </div>

      {children}

      {rows && rows.length > 0 ? (
        <dl className="verdict__rows">
          {rows.map((row) => (
            <div className="verdict__row" key={row.term}>
              <dt>{row.term}</dt>
              <dd>
                <FactDetail fact={row} />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {action ? (
        <div className="verdict__foot">
          <p className="verdict__prompt">{action.prompt}</p>
          {action.href.startsWith('/') ? (
            <Link href={action.href} className="verdict__action">
              {action.label}
            </Link>
          ) : (
            <a href={action.href} className="verdict__action">
              {action.label}
            </a>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** A row of the index's card, which sends the reader to a cluster below. */
export function VerdictLinks({ children }: { children: React.ReactNode }) {
  return <div className="verdict__links">{children}</div>;
}

export function VerdictLink({
  href,
  label,
  sub,
}: {
  href: string;
  label: string;
  sub: string;
}) {
  return (
    <a href={href} className="verdict__link">
      <span>
        <strong>{label}</strong>
        <br />
        <span className="verdict__link-sub">{sub}</span>
      </span>
      <span className="verdict__link-arrow" aria-hidden="true">
        →
      </span>
    </a>
  );
}
