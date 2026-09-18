import type { KeyFact } from '@/lib/content';
import { FactDetail } from '@/components/Prose';

export type QuickFact = KeyFact;

/**
 * The quick-facts box.
 *
 * `panel` is the wide box that sits under the answer on a library page.
 * `rail` is the interior system's: narrower, titled, and stacked so it reads
 * down the contents rail rather than across a reading column.
 */
export function QuickFacts({
  facts,
  variant = 'panel',
  title = 'Quick facts',
}: {
  facts: QuickFact[];
  variant?: 'panel' | 'rail';
  title?: string;
}) {
  if (facts.length === 0) return null;

  return (
    <div className={variant === 'rail' ? 'quick-facts quick-facts--rail' : 'quick-facts'}>
      {variant === 'rail' ? <p className="quick-facts__title">{title}</p> : null}
      <dl>
        {facts.map((fact) => (
          // `display:contents` in the panel so each term and detail is its own
          // cell of the two-column grid; a real block in the rail, where a pair
          // stacks and the gap belongs between pairs rather than inside one.
          <div key={fact.term} style={variant === 'panel' ? { display: 'contents' } : undefined}>
            <dt>{fact.term}</dt>
            <dd>
              <FactDetail fact={fact} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
