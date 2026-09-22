import Image from 'next/image';
import Link from 'next/link';
import { SiteNav, type NavItem } from '@/components/SiteNav';

/**
 * Five links and one call to action. Deliberately not a link to every page: a
 * masthead that lists everything makes the reader choose from seven options
 * before they have read a word, and it is what forced the whole nav behind a
 * Menu button as far up as a landscape iPad.
 *
 * The first four are the things a visitor arrives wanting — the problem they
 * searched for, what we do about it, whether we close in their county, and what
 * it costs — plus the one thing we want them to do. Every label is written in
 * the case it is meant to appear in, since nothing in the nav styling
 * transforms case.
 *
 * What is not here is still reachable and still in the sitemap: /partners,
 * /team, /reviews, /quote and /contact all sit in the footer, and
 * the hub pages cross-link them in prose, which is where a reader who wants
 * them is already looking. /about stays in the footer too — a masthead link
 * does not make the footer one redundant.
 */
const NAV: NavItem[] = [
  { href: '/title-problems', label: 'Title problems' },
  { href: '/services', label: 'Services' },
  { href: '/counties', label: 'Counties' },
  { href: '/estimate', label: 'Estimate' },
  { href: '/about', label: 'About' },
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
            // Eager rather than preloaded: it is the first thing in the body, so
            // the parser finds it at once, and a preload link would only compete
            // with the fonts for the first round trip.
            loading="eager"
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
