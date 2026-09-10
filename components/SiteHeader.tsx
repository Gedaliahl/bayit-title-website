import Link from 'next/link';
import { site } from '@/lib/site';

const NAV = [
  { href: '/title-problems', label: 'Title problems' },
  { href: '/services', label: 'Services' },
  { href: '/counties', label: 'Counties' },
  { href: '/about', label: 'About' },
  { href: '/reviews', label: 'Reviews' },
];

export function SiteHeader() {
  return (
    <header className="masthead">
      <div className="frame masthead__inner">
        <Link href="/" className="wordmark">
          {site.name}
          <span className="wordmark__meaning">Bayit means home</span>
        </Link>

        <nav className="nav" aria-label="Primary">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <Link href="/order" className="btn btn--primary">
            Open an order
          </Link>
        </nav>
      </div>
    </header>
  );
}
