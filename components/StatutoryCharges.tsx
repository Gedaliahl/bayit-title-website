import type { StatutoryCharge } from '@/lib/statutory-rates';

/**
 * A figure and the section that sets it, in the same box. The citation is the
 * point: a closing cost on a web page is worth nothing unless the reader can
 * open the statute and see it for themselves.
 */
export function StatutoryCharges({ charges }: { charges: StatutoryCharge[] }) {
  if (charges.length === 0) return null;

  return (
    <div className="quick-facts">
      <dl>
        {charges.map((charge) => (
          <div key={charge.label} style={{ display: 'contents' }}>
            <dt>{charge.label}</dt>
            <dd>
              <strong>{charge.amount}</strong>
              {charge.note ? <> {charge.note}</> : null}{' '}
              <a href={charge.sourceUrl} rel="nofollow">
                {charge.cite}
              </a>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
