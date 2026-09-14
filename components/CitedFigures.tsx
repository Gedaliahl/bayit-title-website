import type { CitedFigure } from '@/lib/cited-figures';

/**
 * A figure and the section that sets it, in the same box. The citation is the
 * point: a closing cost on a web page is worth nothing unless the reader can
 * open the statute and see it for themselves.
 */
export function CitedFigures({ figures }: { figures: CitedFigure[] }) {
  if (figures.length === 0) return null;

  return (
    <div className="quick-facts">
      <dl>
        {figures.map((figure) => (
          <div key={figure.label} style={{ display: 'contents' }}>
            <dt>{figure.label}</dt>
            <dd>
              <strong>{figure.amount}</strong>
              {figure.note ? <> {figure.note}</> : null}{' '}
              <a href={figure.sourceUrl} rel="nofollow">
                {figure.cite}
              </a>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
