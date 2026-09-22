/**
 * The order of work on a file, so a caller has a name for the step they are
 * asking about. Labelled an example on purpose: it is the sequence, not a
 * schedule, and nothing here promises a date.
 *
 * A disc walks the rail as the card loops — file, search, key, house — filling
 * each dot as it arrives and drawing the rail gold behind it. The walk is what
 * shows progress now, which is why no single step is marked in progress. It is
 * CSS alone (see `app/globals.css`): no JavaScript, and it holds still at the
 * finished state for a reader who has asked for less motion. It loops for as
 * long as the page is open, so it carries a pause switch (WCAG 2.2.2).
 */

import { MotionToggle } from './MotionToggle';

const ICON = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const STEPS: { title: string; detail: string; icon: React.ReactNode }[] = [
  {
    title: 'Order opened',
    detail: 'Search and estoppel ordered the same day.',
    icon: (
      <svg {...ICON}>
        <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z" />
        <path d="M14 3v4h4" />
        <path d="M9.5 12h5M9.5 16h5" />
      </svg>
    ),
  },
  {
    title: 'Search examined',
    detail: 'Anything on the file explained in writing.',
    icon: (
      <svg {...ICON}>
        <circle cx="10.5" cy="10.5" r="6" />
        <path d="M15 15l5 5" />
      </svg>
    ),
  },
  {
    title: 'Cleared to close',
    detail: 'Payoffs, releases, settlement statement.',
    icon: (
      <svg {...ICON}>
        <circle cx="7.5" cy="15.5" r="4" />
        <path d="M10.5 12.5 20 3" />
        <path d="M16 7l3 3" />
      </svg>
    ),
  },
  {
    title: 'Signed and recorded',
    detail: 'In office, mobile or remote online notarization.',
    icon: (
      <svg {...ICON}>
        <path d="M4 12 12 5l8 7" />
        <path d="M6 11v9h12v-9" />
        <circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

export function FileTimeline() {
  return (
    <div className="filecard">
      <div className="filecard__head">
        <h2>How your file moves</h2>
        <span className="chip">Example file</span>
      </div>

      {STEPS.map((step, index) => (
        <div key={step.title} className={`filestep filestep--s${index + 1}`}>
          <div className="filestep__rail">
            <span className="filestep__dot" />
            {index < STEPS.length - 1 ? <span className="filestep__line" /> : null}
            <span className="filestep__disc" aria-hidden="true">
              {step.icon}
            </span>
          </div>
          <div className="filestep__body">
            <p>{step.title}</p>
            <p>{step.detail}</p>
          </div>
        </div>
      ))}

      <MotionToggle label="Pause the example file" className="filecard__toggle" />
    </div>
  );
}
