'use client';

import { ESTIMATE_MODES, ROUTER } from '@/content/estimate';
import { site } from '@/lib/site';
import { useEstimateMode } from './EstimateMode';

/**
 * The card beside the headline. Same shell as the verdict card on every other
 * interior page, but its rows are buttons rather than answers: the reader's
 * first question here is which way in fits, and the card sends them there.
 */
export function RouterCard() {
  const { setMode } = useEstimateMode();

  return (
    <div className="verdict">
      <div className="verdict__cap">
        <p className="verdict__eyebrow">{ROUTER.eyebrow}</p>
        <p className="verdict__headline">{ROUTER.headline}</p>
      </div>

      <div className="verdict__links">
        {ESTIMATE_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            className="verdict__link verdict__link--button"
            onClick={() => setMode(mode)}
          >
            <span>
              <strong>{ROUTER.rows[mode].label}</strong>
              <span className="verdict__link-sub">{ROUTER.rows[mode].sub}</span>
            </span>
            <span className="verdict__link-arrow" aria-hidden="true">
              →
            </span>
          </button>
        ))}
      </div>

      <div className="verdict__foot">
        <p className="verdict__prompt">{ROUTER.prompt}</p>
        <a href={`tel:${site.phone}`} className="verdict__action">
          {site.phoneDisplay}
        </a>
      </div>
    </div>
  );
}
