'use client';

import { RESULT } from '@/content/estimate';
import type { EstimateGroup } from '@/lib/closing-estimate';
import { formatMoney } from '@/lib/statutory-rates';

/**
 * The figures, beside the form. Same shell as the verdict card: the total in
 * the dark cap, the lines under it, each cited, and what is not in it at the
 * foot. Announced politely, so a screen reader hears the total change without
 * being interrupted mid-field.
 */
export function FigureCard({
  eyebrow,
  total,
  sub,
  groups,
  totalLabel,
  alternateText,
  unknownsText,
  emptyText,
}: {
  eyebrow: string;
  total: string;
  sub: string;
  groups: EstimateGroup[];
  totalLabel: string;
  alternateText: string | null;
  unknownsText: string;
  emptyText: string;
}) {
  const hasResult = groups.length > 0;

  return (
    <div className="verdict figure-card" aria-live="polite">
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
                      <a className="figure-line__cite" href={line.sourceUrl} rel="nofollow">
                        {line.cite}
                      </a>
                    </div>
                    <div className="figure-line__amount">{formatMoney(line.value)}</div>
                  </div>
                ))}
                {group.lines.length > 1 ? (
                  <div className="figure-subtotal">
                    <span>{RESULT.subtotal}</span>
                    <span className="figure-line__amount">{formatMoney(group.subtotal)}</span>
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
            <p>
              <strong>{RESULT.notInIt}</strong> {unknownsText}
            </p>
          </div>
        </>
      ) : (
        <p className="figure-card__empty">{emptyText}</p>
      )}
    </div>
  );
}
