/**
 * The transaction types the office closes, as a moving band.
 *
 * The labels match the type options on the order form, so what a reader sees
 * here is what they will be asked to choose from when they open a file.
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
    label: 'Residential purchase',
    icon: (
      <svg {...ICON}>
        <path d="M4 12 12 5l8 7" />
        <path d="M6 11v9h12v-9" />
        <circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none" />
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
    label: 'Cash purchase',
    icon: (
      <svg {...ICON}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5v9" />
        <path d="M14.5 9.75c-.4-.9-1.4-1.4-2.5-1.4-1.5 0-2.5.8-2.5 1.9 0 2.6 5 1.2 5 3.8 0 1.1-1 1.9-2.5 1.9-1.1 0-2.1-.5-2.5-1.4" />
      </svg>
    ),
  },
  {
    label: 'New construction',
    icon: (
      <svg {...ICON}>
        <path d="M3 21h18" />
        <path d="M6 21V11h12v10" />
        <path d="M9 11V6l3-2 3 2v5" />
        <path d="M6 15h12" />
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
    label: 'Condominium and HOA',
    icon: (
      <svg {...ICON}>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 7.5h.01M12 7.5h.01M15 7.5h.01M9 11h.01M12 11h.01M15 11h.01M9 14.5h.01M12 14.5h.01M15 14.5h.01" />
        <path d="M10.5 21v-2.5h3V21" />
      </svg>
    ),
  },
  {
    label: 'Estates and probate',
    icon: (
      <svg {...ICON}>
        <path d="M12 21c-4.5-1.6-7-4.6-7-9V6l7-3 7 3v6c0 4.4-2.5 7.4-7 9z" />
        <path d="M9.5 12l2 2 3.5-4" />
      </svg>
    ),
  },
  {
    label: 'Investors and entities',
    icon: (
      <svg {...ICON}>
        <path d="M4 19V11" />
        <path d="M10 19V6" />
        <path d="M16 19v-8" />
        <path d="M22 19V3" />
        <path d="M2 21h20" />
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
        {/* The loop's second half. Hidden from assistive technology so the list
            is announced once, not twice. */}
        <span style={{ display: 'inline-flex', alignItems: 'center' }} aria-hidden="true">
          <Run />
        </span>
      </div>
    </div>
  );
}
