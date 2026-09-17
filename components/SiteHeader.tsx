import Image from 'next/image';
import Link from 'next/link';
import { SiteNav, type NavItem } from '@/components/SiteNav';

/**
 * Four links and one call to action. Deliberately not a link to every page: a
 * masthead that lists everything makes the reader choose from seven options
 * before they have read a word, and it is what forced the whole nav behind a
 * Menu button as far up as a landscape iPad.
 *
 * What is here is the four things a visitor arrives wanting — the problem they
 * searched for, what we do about it, whether we close in their county, and what
 * it costs — plus the one thing we want them to do.
 *
 * What is not here is still reachable and still in the sitemap: /partners,
 * /about, /team, /reviews, /quote, /calculator and /contact all sit in the
 * footer, and the hub pages cross-link them in prose, which is where a reader
 * who wants them is already looking.
 */
const NAV: NavItem[] = [
  { href: '/title-problems', label: 'Title problems' },
  { href: '/services', label: 'Services' },
  { href: '/counties', label: 'Counties' },
  { href: '/estimate', label: 'Estimate' },
];

const ACTION: NavItem = { href: '/order', label: 'Open an order' };

export function SiteHeader() {
  return (
    <header className="masthead">
      <div className="frame masthead__inner">
        <Link href="/" className="wordmark">
          <Image
            src="/brand/mark-t.png"
            alt=""
            width={38}
            height={42}
            className="wordmark__mark"
            priority
          />
          <span className="wordmark__name">
            Bayit <span>Title</span>
          </span>
        </Link>

        <SiteNav items={NAV} action={ACTION} />
      </div>
    </header>
  );
}
