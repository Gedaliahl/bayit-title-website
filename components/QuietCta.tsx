import Link from 'next/link';
import { site } from '@/lib/site';

/**
 * One quiet CTA per page. Specific about what happens next rather than urgent
 * about acting now.
 */
export function QuietCta({
  text = 'If this is on a file you are working on, send us the address and the contract date and we will tell you what the search shows.',
  action = 'Open an order',
  href = '/order',
}: {
  text?: string;
  action?: string;
  href?: string;
}) {
  return (
    <aside className="cta">
      <p>{text}</p>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Link href={href} className="btn btn--primary">
          {action}
        </Link>
        <a href={`tel:${site.phone}`} className="btn btn--quiet">
          {site.phoneDisplay}
        </a>
      </div>
    </aside>
  );
}
