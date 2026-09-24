'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

import { BAND, ESTIMATE_MODES, TABS } from '@/content/estimate';
import { CalculatorPane, type EstimatorCounty } from './CalculatorPane';
import { panelHeadingId, useEstimateMode } from './EstimateMode';

/**
 * The contract form is not part of the page's first download. It opens hidden,
 * most visits never show it, and it is the heaviest form on the page: sent
 * with the page, a phone had to download, parse and lay it out before the
 * first paint. It is fetched once the page is idle, so it is in hand before
 * anyone can click, and mounted the first time its option opens.
 */
const loadUploadPane = () => import('./UploadPane');
const UploadPane = dynamic(() => loadUploadPane().then((module) => module.UploadPane));

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
 * field. The contract pane is only mounted the first time option 3 opens (see
 * `UploadPane` above); before that it has nothing typed in it to keep.
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

  // Once opened it stays mounted, hidden like the other pane, so what was typed
  // into it is still there when the reader comes back to it.
  const [uploadOpened, setUploadOpened] = useState(false);
  if (mode === 'upload' && !uploadOpened) setUploadOpened(true);

  useEffect(() => {
    const prefetch = () => void loadUploadPane().catch(() => {});
    if ('requestIdleCallback' in window) {
      const handle = requestIdleCallback(prefetch, { timeout: 5000 });
      return () => cancelIdleCallback(handle);
    }
    const handle = setTimeout(prefetch, 2000);
    return () => clearTimeout(handle);
  }, []);

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
          {uploadOpened ? <UploadPane hidden={mode !== 'upload'} /> : null}
        </section>
      </div>
    </section>
  );
}
