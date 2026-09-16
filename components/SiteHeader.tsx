import Link from 'next/link';
import { site } from '@/lib/site';
import { SiteNav, type NavItem } from '@/components/SiteNav';

const NAV: NavItem[] = [
  { href: '/title-problems', label: 'Title problems' },
  { href: '/services', label: 'Services' },
  { href: '/counties', label: 'Counties' },
  { href: '/estimate', label: 'Estimate a cost' },
  { href: '/partners', label: 'Agents & lenders' },
  { href: '/about', label: 'About' },
  { href: '/reviews', label: 'Reviews' },
];

const ACTION: NavItem = { href: '/order', label: 'Open an order' };

export function SiteHeader() {
  return (
    <header className="masthead">
      <div className="frame masthead__inner">
        <Link href="/" className="wordmark">
          {site.name}
          <span className="wordmark__meaning">Bayit means home</span>
        </Link>

        <SiteNav items={NAV} action={ACTION} />
      </div>
    </header>
  );
}
