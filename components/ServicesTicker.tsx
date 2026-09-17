/**
 * The transaction types the office closes, as a moving band.
 *
 * A short read of what the office handles — the headline categories, not the
 * full list. The order form's type options are finer grained than this.
 */

const ICON = {
  width: 32,
  height: 32,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const SERVICES: { label: string; icon: React.ReactNode }[] = [
  {
    label: 'Residential',
    icon: (
      <svg {...ICON}>
        <path d="M4 12 12 5l8 7" />
        <path d="M6 11v9h12v-9" />
        <circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: 'Commercial',
    icon: (
      <svg {...ICON}>
        <path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16" />
        <path d="M14 10h5a1 1 0 0 1 1 1v10" />
        <path d="M2 21h20" />
        <path d="M8 8h2M8 12h2M8 16h2" />
      </svg>
    ),
  },
  {
    label: 'Refinance',
    icon: (
      <svg {...ICON}>
        <path d="M4 12a8 8 0 0 1 13.7-5.6" />
        <path d="M18 3v4h-4" />
        <path d="M20 12a8 8 0 0 1-13.7 5.6" />
        <path d="M6 21v-4h4" />
      </svg>
    ),
  },
  {
    label: '1031 Exchange',
    icon: (
      <svg {...ICON}>
        <path d="M4 9h13" />
        <path d="M14 6l3 3-3 3" />
        <path d="M20 15H7" />
        <path d="M10 12l-3 3 3 3" />
      </svg>
    ),
  },
  {
    label: 'FIRPTA',
    icon: (
      <svg {...ICON}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.5 12h17" />
        <path d="M12 3.5c2.2 2.3 3.4 5.3 3.4 8.5s-1.2 6.2-3.4 8.5c-2.2-2.3-3.4-5.3-3.4-8.5S9.8 5.8 12 3.5z" />
      </svg>
    ),
  },
];

function Run() {
  return (
    <>
      {SERVICES.map((service) => (
        <span key={service.label} className="ticker__pill">
          <span className="ticker__icon" aria-hidden="true">
            {service.icon}
          </span>
          {service.label}
        </span>
      ))}
    </>
  );
}

export function ServicesTicker() {
  return (
    <div className="ticker">
      <div className="ticker__track">
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <Run />
        </span>
        {/* The band is short enough that one run of it does not fill a wide
            screen, so the track holds four. Only the first is announced; the
            rest are repeats and would only be read back twice over. The
            keyframe moves the track by half its width, which lands on an
            identical frame, so the loop has no seam. */}
        <span style={{ display: 'inline-flex', alignItems: 'center' }} aria-hidden="true">
          <Run />
          <Run />
          <Run />
        </span>
      </div>
    </div>
  );
}
