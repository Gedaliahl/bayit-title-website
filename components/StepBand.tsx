import { VerifyText } from '@/components/Prose';

export interface BandStep {
  /** `STEP 1`, `01`, `FIRST`, `SOUTH FLORIDA` — set in caps by the stylesheet. */
  label: string;
  title: string;
  body: string;
}

/**
 * The cream band under the hero: what happens, in order.
 *
 * A reader with a live file is not asking what the process is in general, they
 * are asking which of these they are standing in — which a paragraph cannot
 * show them and a row of cards can.
 */
export function StepBand({
  heading,
  caption,
  steps,
  columns,
}: {
  heading: string;
  caption?: string;
  steps: BandStep[];
  /** How many cards across at full width. Below 62rem it is always two. */
  columns: 3 | 4 | 5;
}) {
  if (steps.length === 0) return null;

  return (
    <section className="band">
      <div className="frame band__inner">
        <div className="band__head">
          <h2>{heading}</h2>
          {caption ? <span className="band__caption">{caption}</span> : null}
        </div>
        <ol className={columns === 4 ? 'band__grid' : `band__grid band__grid--${columns}`}>
          {steps.map((step) => (
            <li className="step-card" key={`${step.label}-${step.title}`}>
              <p className="step-card__label">{step.label}</p>
              <p className="step-card__title">{step.title}</p>
              <p className="step-card__body">
                <VerifyText text={step.body} />
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
