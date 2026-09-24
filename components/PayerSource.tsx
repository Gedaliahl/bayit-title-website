import { payerCredit, type Location } from '@/lib/locations';
import { formatLongDate } from '@/lib/seo';

/**
 * The line under a county's custom saying whose statement it is. A county page
 * and each of its city pages print the same custom, so they print this same
 * line: a government office or First American by name, or our own team.
 */
export function PayerSource({ county }: { county: Location }) {
  const credit = payerCredit(county);
  if (!credit) return null;

  if (credit.kind === 'team') {
    return (
      <p className="muted">
        That is the custom as we see it on our own files, confirmed on{' '}
        {formatLongDate(credit.checkedOn)}. It is a report of what is usual, not a rule, and not a
        promise about your contract.
      </p>
    );
  }

  return (
    <p className="muted">
      That is the custom as published by{' '}
      {credit.url ? (
        <a href={credit.url} rel="nofollow">
          {credit.name}
        </a>
      ) : (
        credit.name
      )}
      {credit.checkedOn ? `, read on ${formatLongDate(credit.checkedOn)}` : ''}. It is a report of
      what is usual, not a rule, and not a promise about your contract.
    </p>
  );
}
