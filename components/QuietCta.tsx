import Link from 'next/link';
import { site } from '@/lib/site';

/**
 * One quiet CTA per page. Specific about what happens next rather than urgent
 * about acting now.
 *
 * Two shapes. `inset` is the panel that sits at the end of a reading column,
 * which is what most of the site wants. `band` is the interior-page system's:
 * the last full-width thing before the footer, on its own ground, so the page
 * ends on an offer rather than trailing off.
 */
export function QuietCta({
  text = 'If this is on a file you are working on, send us the address and the contract date and we will tell you what the search shows.',
  action = 'Open an order',
  href = '/order',
  variant = 'inset',
}: {
  text?: string;
  action?: string;
  href?: string;
  variant?: 'inset' | 'band';
}) {
  const body = (
    <>
      <p>{text}</p>
      <div className="cta__actions">
        <Link href={href} className="btn btn--primary">
          {action}
        </Link>
        <a href={`tel:${site.phone}`} className="btn btn--quiet">
          {site.phoneDisplay}
        </a>
      </div>
    </>
  );

  if (variant === 'band') {
    return (
      <aside className="cta cta--band">
        <div className="frame cta__inner">{body}</div>
      </aside>
    );
  }

  return <aside className="cta">{body}</aside>;
}
