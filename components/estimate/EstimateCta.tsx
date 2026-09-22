'use client';

import { CTA } from '@/content/estimate';
import { site } from '@/lib/site';
import { useEstimateMode } from './EstimateMode';

/**
 * The quiet CTA at the foot of the page. The same band as QuietCta renders on
 * the other interior pages, with one difference: the primary action stays on
 * this page. It opens the third way in and takes the reader back up to it.
 */
export function EstimateCta() {
  const { setMode } = useEstimateMode();

  return (
    <aside className="cta cta--band">
      <div className="frame cta__inner">
        <p>{CTA.text}</p>
        <div className="cta__actions">
          <a
            href="#estimator"
            className="btn btn--primary"
            onClick={(event) => {
              event.preventDefault();
              setMode('upload');
              document.getElementById('estimator')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            {CTA.action}
          </a>
          <a href={`tel:${site.phone}`} className="btn btn--quiet">
            {site.phoneDisplay}
          </a>
        </div>
      </div>
    </aside>
  );
}
