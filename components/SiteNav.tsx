'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavItem {
  href: string;
  label: string;
}

/**
 * The primary navigation, which is a plain row on a desktop and a disclosure
 * behind a Menu button on a phone.
 *
 * It is a client component for one reason: the button needs `aria-expanded` to
 * track real state, and a CSS-only disclosure cannot report that. The
 * alternatives were worse — a checkbox announced as a checkbox, or a `details`
 * element that has to be forced open again at desktop width through
 * `::details-content`, which is recent enough that a slightly older browser
 * would collapse the desktop nav.
 *
 * Nothing here is required for the links to work. The markup ships complete in
 * the HTML, the collapse is a media query, and `@media (scripting: none)` in
 * globals.css leaves the full list open where scripts do not run. A reader with
 * no JavaScript gets the old wrapped nav rather than a button that does
 * nothing.
 */
export function SiteNav({
  items,
  action,
}: {
  items: NavItem[];
  action: NavItem;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Follow a link and the panel has done its job. Without this it stays open
  // over the top of the page you just asked for, because the header is not
  // remounted between routes. Adjusted during render rather than in an effect:
  // React re-runs this component before anything is painted, so the panel is
  // never briefly shown open on the new page, and there is no second render
  // pass to pay for. Back and forward are covered too, which closing on click
  // would have missed.
  const [renderedAt, setRenderedAt] = useState(pathname);
  if (renderedAt !== pathname) {
    setRenderedAt(pathname);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="nav__toggle"
        // Controls the same element the label points at, so the button, the
        // panel and the screen reader all agree on what is being opened.
        aria-expanded={open}
        aria-controls="primary-nav"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="nav__toggle-glyph" aria-hidden="true">
          {open ? '✕' : '☰'}
        </span>
        Menu
      </button>

      <nav
        id="primary-nav"
        className={open ? 'nav nav--open' : 'nav'}
        aria-label="Primary"
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={pathname === item.href ? 'page' : undefined}
          >
            {item.label}
          </Link>
        ))}
        <Link href={action.href} className="btn btn--navy">
          {action.label}
        </Link>
      </nav>
    </>
  );
}
