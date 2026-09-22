'use client';

import { useEffect, useRef, useState } from 'react';

import { RESULT } from '@/content/estimate';
import type { EstimateGroup } from '@/lib/closing-estimate';
import { formatCents } from '@/lib/statutory-rates';

/** Long enough for a reader to finish typing a figure, short enough to still feel like an answer. */
const ANNOUNCE_AFTER_MS = 500;

/** Where the phone's total bar sends the reader. */
export const FIGURES_ID = 'estimate-figures';

/**
 * The figures, beside the form. Same shell as the verdict card: the total in
 * the dark cap, the lines under it, each cited, and what is not in it at the
 * foot. Every amount is to the cent, since most of them are and a column that
 * mixes "$2,575" with "$5.50" reads as two kinds of number.
 *
 * The card itself is not a live region: it is dozens of nodes, and every
 * keystroke would read all of them out. One hidden line says the total
 * instead, once the figures have stopped moving.
 */
export function FigureCard({
  eyebrow,
  total,
  sub,
  groups,
  totalLabel,
  alternateText,
  otherPartyText,
  unknownsText,
  emptyText,
  actions,
}: {
  eyebrow: string;
  total: string;
  sub: string;
  groups: EstimateGroup[];
  totalLabel: string;
  alternateText: string | null;
  /** What the other side of the same closing carries. Null on a refinance. */
  otherPartyText: string | null;
  unknownsText: string;
  emptyText: string;
  /** Copy, print and reset, under the foot. */
  actions?: React.ReactNode;
}) {
  const hasResult = groups.length > 0;
  const message = hasResult ? RESULT.announce(totalLabel, total) : RESULT.nothingYet;

  // Nothing is said on arrival: the reader has not changed anything yet, and
  // the figures are on the page for anyone who goes to read them.
  const [spoken, setSpoken] = useState('');
  const first = useRef(message);
  useEffect(() => {
    if (message === first.current) return;
    const timer = setTimeout(() => setSpoken(message), ANNOUNCE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <div className="verdict figure-card" id={FIGURES_ID}>
      <p className="visually-hidden" aria-live="polite">
        {spoken}
      </p>

      <div className="verdict__cap">
        <p className="verdict__eyebrow figure-card__eyebrow">{eyebrow}</p>
        <p className="figure-card__total">{total}</p>
        <p className="figure-card__sub">{sub}</p>
      </div>

      {hasResult ? (
        <>
          <div className="figure-card__body">
            {groups.map((group) => (
              <section className="figure-group" key={group.title}>
                <h3 className="figure-group__title">{group.title}</h3>
                {group.lines.map((line) => (
                  <div className="figure-line" key={line.label}>
                    <div className="figure-line__label">
                      {line.label}
                      {line.note ? <span className="figure-line__note">{line.note}</span> : null}
                      {/* A line this office sets has nothing to link to, so it
                          names us in the same place rather than faking a source. */}
                      {line.sourceUrl ? (
                        <a className="figure-line__cite" href={line.sourceUrl} rel="nofollow">
                          {line.cite}
                        </a>
                      ) : (
                        <span className="figure-line__cite figure-line__cite--ours">
                          {line.cite}
                        </span>
                      )}
                    </div>
                    <div className="figure-line__amount">{formatCents(line.value)}</div>
                  </div>
                ))}
                {group.lines.length > 1 ? (
                  <div className="figure-subtotal">
                    <span>{RESULT.subtotal}</span>
                    <span className="figure-line__amount">{formatCents(group.subtotal)}</span>
                  </div>
                ) : null}
              </section>
            ))}

            <div className="figure-total">
              <div>
                <strong>{totalLabel}</strong>
                <span className="figure-line__note">{RESULT.totalNote}</span>
              </div>
              <div className="figure-line__amount">{total}</div>
            </div>
          </div>

          <div className="figure-card__foot">
            {alternateText ? <p>{alternateText}</p> : null}
            {otherPartyText ? <p>{otherPartyText}</p> : null}
            <p>
              <strong>{RESULT.notInIt}</strong> {unknownsText}
            </p>
          </div>
        </>
      ) : (
        <p className="figure-card__empty">{emptyText}</p>
      )}

      {actions}
    </div>
  );
}
