'use client';

import { useEffect, useState } from 'react';

export interface RailItem {
  id: string;
  label: string;
  /** The index's clusters show how many pages are in each. */
  count?: number;
}

/**
 * The contents rail beside the detail column.
 *
 * The links ship complete in the HTML and are ordinary fragment links, so this
 * works with no scripting at all. The one thing scripting adds is the mark
 * against the section the reader is currently in, which is why this is a client
 * component and why it renders identically before it hydrates.
 */
export function Rail({
  label,
  items,
  children,
}: {
  label: string;
  items: RailItem[];
  /** Anything below the list — the article's quick-facts box. */
  children?: React.ReactNode;
}) {
  const active = useActiveSection(items.map((item) => item.id));

  return (
    <aside className="rail">
      <nav aria-label={label}>
        <p className="rail__label">{label}</p>
        <ol className="rail__list">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={item.id === active ? 'rail__link is-active' : 'rail__link'}
                aria-current={item.id === active ? 'true' : undefined}
              >
                {item.label}
                {item.count === undefined ? null : (
                  <span className="rail__count">{item.count}</span>
                )}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      {children}
    </aside>
  );
}

/**
 * Which section the reader is in.
 *
 * The bottom margin holds the window's attention to its top third: without it
 * every section on a tall screen is "intersecting" at once and the mark sits on
 * the last one rather than the one being read. Where a section is shorter than
 * that band, several are visible together and the topmost wins, which is the
 * one the reader has just arrived at.
 */
function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);

  // The array is rebuilt on every render, so the effect keys off its contents.
  const key = ids.join('|');

  useEffect(() => {
    const order = key.split('|').filter(Boolean);
    const sections = order
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    if (sections.length === 0 || typeof IntersectionObserver === 'undefined') return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const first = order.find((id) => visible.has(id));
        // Nothing visible means the reader is between sections mid-scroll.
        // Leaving the last mark in place is steadier than clearing it.
        if (first) setActive(first);
      },
      { rootMargin: '-96px 0px -66% 0px' },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [key]);

  return active;
}
