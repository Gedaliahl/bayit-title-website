import type { Rate } from '@/lib/rates';
import { formatRate } from '@/lib/rates';
import { formatLongDate } from '@/lib/seo';

/**
 * A published fee table.
 *
 * Every row prints its own authority underneath the charge, and every distinct
 * source is linked below the table. That is the point of the component: on a
 * licensed agency's site a figure without a traceable source should not render.
 */
export function RateTable({
  rates,
  localKeys = [],
  localLabel,
}: {
  rates: Rate[];
  /** Keys whose figure departs from the statewide one, marked in the table. */
  localKeys?: string[];
  localLabel?: string;
}) {
  if (rates.length === 0) return null;

  const sources = [...new Set(rates.map((rate) => rate.sourceUrl))];
  // The oldest check in the table, so the line never claims a figure was
  // verified more recently than it was.
  const checkedOn = rates.reduce(
    (oldest, rate) => (rate.effectiveFrom < oldest ? rate.effectiveFrom : oldest),
    rates[0].effectiveFrom,
  );

  return (
    <>
      <div className="rate-table__scroll">
        <table className="rate-table">
          <thead>
            <tr>
              <th scope="col">Charge</th>
              <th scope="col" className="rate-table__amount">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {rates.map((rate) => (
              <tr key={`${rate.countySlug ?? 'fl'}-${rate.key}`}>
                <td>
                  {rate.label}
                  {localLabel && localKeys.includes(rate.key) ? (
                    <span className="rate-table__badge">{localLabel}</span>
                  ) : null}
                  {rate.sourceNote ? (
                    <span className="rate-table__note">{rate.sourceNote}</span>
                  ) : null}
                </td>
                <td className="rate-table__amount">{formatRate(rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="form-note">
        {sources.length === 1 ? 'Source' : 'Sources'}:{' '}
        {sources.map((url, index) => (
          <span key={url}>
            {index > 0 ? ' · ' : ''}
            <a href={url} rel="nofollow noopener" target="_blank">
              {sourceName(url)}
            </a>
          </span>
        ))}
        . Checked {formatLongDate(checkedOn)}. Tell us if one of these has moved and we will
        correct it.
      </p>
    </>
  );
}

/** A readable name for the linked source, so the line does not print raw URLs. */
function sourceName(url: string): string {
  if (url.includes('leg.state.fl.us')) {
    const match = url.match(/Sections\/(\d+)\.(\d+)\.html/);
    return match
      ? `Fla. Stat. § ${Number(match[1])}.${match[2]}`
      : 'The Florida Statutes';
  }
  if (url.includes('floridarevenue.com')) return 'Florida Department of Revenue';
  if (url.includes('miamidadeclerk.gov')) return 'Miami-Dade Clerk of the Court';

  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
