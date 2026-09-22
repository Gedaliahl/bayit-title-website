import type { FaqItem } from '@/lib/faq';
import { VerifyText, markVerifyFlags } from '@/components/Prose';

/**
 * The common questions, as native disclosures.
 *
 * `<details>` rather than a scripted accordion for two reasons: the answers are
 * in the HTML whether or not they are open, so a crawler and an assistant read
 * all of them, and a reader with no scripting can still open one. The first is
 * open because a page whose questions are all shut looks like it has none.
 */
export function Faq({ items }: { items: FaqItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="faq">
      {items.map((item, index) => (
        <details key={item.question} open={index === 0}>
          <summary>
            {item.question}
            <span className="faq__plus" aria-hidden="true">
              +
            </span>
          </summary>
          {item.html ? (
            <div
              className="faq__answer"
              // Markdown authored in this repo and reviewed before merge.
              dangerouslySetInnerHTML={{ __html: markVerifyFlags(item.html) }}
            />
          ) : (
            <p>
              <VerifyText text={item.answer} />
            </p>
          )}
        </details>
      ))}
    </div>
  );
}
