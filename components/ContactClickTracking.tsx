'use client';

import { useEffect } from 'react';
import { track } from '@vercel/analytics';

/**
 * Counts a tap on a phone number or an email address, and the page it was on.
 *
 * Most of this firm's business starts with a call, and a call leaves no trace
 * in the analytics a form does: without this, a page that sends the office
 * three calls a week and one that sends none look the same. One listener on the
 * document rather than a wrapper on every link, so the tel: links already on
 * forty pages are counted without any of them changing, and a link added later
 * is counted without anyone remembering to.
 *
 * Nothing about the visitor is sent — the event is the kind of link and the
 * path — and the privacy policy says so in section 5.
 */
export function ContactClickTracking() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href^="tel:"], a[href^="mailto:"]');
      if (!link) return;

      const method = link.getAttribute('href')!.startsWith('tel:') ? 'phone' : 'email';
      track('contact_click', { method, path: window.location.pathname });
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return null;
}
