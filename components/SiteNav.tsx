'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavItem {
  href: string;
  label: string;
}

/** The width the stylesheet collapses the nav below. The two must move together. */
const COLLAPSED = '(max-width: 58rem)';

const PANEL_ID = 'primary-nav';

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
 *
 * The open panel pushes the page down rather than covering it, so focus is not
 * trapped inside it: everything after it is still where it was, one Tab away.
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
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Back and forward change the route without a click on any link here, and
  // the header is not remounted between routes, so without this the panel
  // would stay open over the page just asked for. Adjusted during render rather
  // than in an effect: React re-runs this component before anything is
  // painted, so the panel is never briefly shown open on the new page.
  const [renderedAt, setRenderedAt] = useState(pathname);
  if (renderedAt !== pathname) {
    setRenderedAt(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    // Escape is how a keyboard reader expects to put a disclosure away, and
    // focus goes back to the button that opened it rather than to the page top.
    // Only from inside the menu: the panel pushes the page down rather than
    // covering it, so a reader can be working in a field below it, and there
    // Escape belongs to the field — closing an address list, say — not to us.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const focused = document.activeElement;
      const inMenu =
        focused === toggleRef.current || Boolean(focused && document.getElementById(PANEL_ID)?.contains(focused));
      if (!inMenu) return;
      setOpen(false);
      toggleRef.current?.focus();
    };

    // Turn a phone to landscape or widen the window past the breakpoint and the
    // row is back; a panel left open would be waiting there the next time the
    // window narrows.
    const collapsed = window.matchMedia(COLLAPSED);
    const onWidthChange = () => {
      if (!collapsed.matches) setOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    collapsed.addEventListener('change', onWidthChange);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      collapsed.removeEventListener('change', onWidthChange);
    };
  }, [open]);

  // Every link closes the panel, including the current page's own and the
  // `?mode=` links, which leave the path as it is, so the render-time check
  // above never sees them. Closing hides the link that had focus, and the
  // browser would drop focus to <body>; it goes to the page instead, which is
  // what the reader just asked for. A modified click opens a new tab and leaves
  // this page, and the panel, as they were.
  const onLinkClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!open || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    setOpen(false);
    document.getElementById('main')?.focus({ preventScroll: true });
  };

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        className="nav__toggle"
        // Controls the same element the label points at, so the button, the
        // panel and the screen reader all agree on what is being opened.
        aria-expanded={open}
        aria-controls={PANEL_ID}
        onClick={() => setOpen((current) => !current)}
      >
        {/* Drawn rather than typed: ☰ and ✕ fall back to whatever symbol font
            the platform has, and came out a different size on every phone. */}
        <svg className="nav__toggle-glyph" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          {open ? (
            <path d="M4.5 4.5l11 11M15.5 4.5l-11 11" />
          ) : (
            <path d="M3 5.5h14M3 10h14M3 14.5h14" />
          )}
        </svg>
        <span className="nav__toggle-label">Menu</span>
      </button>

      <nav
        id={PANEL_ID}
        className={open ? 'nav nav--open' : 'nav'}
        aria-label="Primary"
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onLinkClick}
            // A library article is inside the section its nav item names, so the
            // mark stays on "Title problems" while the reader is on one of its
            // pages. `page` only where the link is the page itself; `true`
            // where it is an ancestor of it, which is what the attribute is for.
            aria-current={
              pathname === item.href
                ? 'page'
                : pathname.startsWith(`${item.href}/`)
                  ? 'true'
                  : undefined
            }
          >
            {item.label}
          </Link>
        ))}
        <Link href={action.href} className="btn btn--dark" onClick={onLinkClick}>
          {action.label}
        </Link>
      </nav>
    </>
  );
}
