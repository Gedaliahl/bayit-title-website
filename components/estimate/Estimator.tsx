'use client';

import { BAND, ESTIMATE_MODES, TABS } from '@/content/estimate';
import { CalculatorPane, type EstimatorCounty } from './CalculatorPane';
import { UploadPane } from './UploadPane';
import { panelHeadingId, useEstimateMode } from './EstimateMode';

/**
 * The band under the hero: the three ways in, and whichever one is open under
 * them.
 *
 * The three are a group of pressed/unpressed buttons rather than ARIA tabs.
 * Tabs need a panel of their own for each tab, and two of these share one: the
 * address and numbers options are the same form with different boxes in it,
 * which is what keeps a county or a loan typed under one there under the
 * other. A button group says exactly what the control does — pick one of
 * three — without promising a structure the page does not have.
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
  const figuresMode = mode === 'upload' ? 'address' : mode;

  return (
    <section id="estimator" className="band estimator">
      <div className="frame band__inner">
        <div className="band__head">
          <h2>{BAND.heading}</h2>
          <span className="band__caption">{BAND.caption}</span>
        </div>

        <div className="mode-tabs" role="group" aria-label={BAND.tablist}>
          {ESTIMATE_MODES.map((candidate) => (
            <button
              key={candidate}
              type="button"
              className="mode-tab"
              aria-pressed={mode === candidate}
              onClick={() => setMode(candidate)}
            >
              <span className="mode-tab__short">{TABS[candidate].short}</span>
              <span className="mode-tab__head">
                <span className="mode-tab__eyebrow">{TABS[candidate].eyebrow}</span>
                {/* aria-pressed already says it; this is for the eye. */}
                {mode === candidate ? (
                  <span className="mode-tab__tag" aria-hidden="true">
                    {BAND.selected}
                  </span>
                ) : null}
              </span>
              <span className="mode-tab__title">{TABS[candidate].title}</span>
              <span className="mode-tab__body">{TABS[candidate].body}</span>
            </button>
          ))}
        </div>

        <section
          id="estimator-figures"
          aria-labelledby={panelHeadingId(figuresMode)}
          hidden={mode === 'upload'}
        >
          <h3 id={panelHeadingId(figuresMode)} className="visually-hidden" tabIndex={-1}>
            {TABS[figuresMode].title}
          </h3>
          <CalculatorPane
            mode={figuresMode}
            hidden={mode === 'upload'}
            counties={counties}
            valueCountySlugs={valueCountySlugs}
          />
        </section>
        <section
          id="estimator-upload"
          aria-labelledby={panelHeadingId('upload')}
          hidden={mode !== 'upload'}
        >
          <h3 id={panelHeadingId('upload')} className="visually-hidden" tabIndex={-1}>
            {TABS.upload.title}
          </h3>
          <UploadPane hidden={mode !== 'upload'} />
        </section>
      </div>
    </section>
  );
}
