'use client';

import { BAND, ESTIMATE_MODES, TABS } from '@/content/estimate';
import { CalculatorPane, type EstimatorCounty } from './CalculatorPane';
import { UploadPane } from './UploadPane';
import { useEstimateMode } from './EstimateMode';

/**
 * The band under the hero: the three ways in as tabs, and whichever one is
 * open under them.
 *
 * Both panes stay mounted and the closed one is hidden rather than unmounted,
 * which is what keeps a price typed under option 2 there when the reader comes
 * back from option 3 — the page promises that changing the mode keeps every
 * field.
 */
export function Estimator({
  counties,
  valueCountySlugs,
}: {
  counties: EstimatorCounty[];
  valueCountySlugs: string[];
}) {
  const { mode, setMode } = useEstimateMode();

  return (
    <section id="estimator" className="band estimator">
      <div className="frame band__inner">
        <div className="band__head">
          <h2>{BAND.heading}</h2>
          <span className="band__caption">{BAND.caption}</span>
        </div>

        <div className="mode-tabs" role="tablist" aria-label={BAND.tablist}>
          {ESTIMATE_MODES.map((candidate) => (
            <button
              key={candidate}
              type="button"
              role="tab"
              className="mode-tab"
              aria-selected={mode === candidate}
              aria-controls={`estimator-${candidate === 'upload' ? 'upload' : 'figures'}`}
              onClick={() => setMode(candidate)}
            >
              <span className="mode-tab__head">
                <span className="mode-tab__eyebrow">{TABS[candidate].eyebrow}</span>
                {mode === candidate ? <span className="mode-tab__tag">{BAND.selected}</span> : null}
              </span>
              <span className="mode-tab__title">{TABS[candidate].title}</span>
              <span className="mode-tab__body">{TABS[candidate].body}</span>
            </button>
          ))}
        </div>

        <div id="estimator-figures" role="tabpanel">
          <CalculatorPane
            mode={mode === 'upload' ? 'address' : mode}
            hidden={mode === 'upload'}
            counties={counties}
            valueCountySlugs={valueCountySlugs}
          />
        </div>
        <div id="estimator-upload" role="tabpanel">
          <UploadPane hidden={mode !== 'upload'} />
        </div>
      </div>
    </section>
  );
}
