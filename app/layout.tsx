import type { Metadata, Viewport } from 'next';
import { Libre_Caslon_Text, DM_Sans } from 'next/font/google';

import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { OrganizationSchema } from '@/components/Schema';
import { Analytics } from '@/components/Analytics';
import { site } from '@/lib/site';
import { SITE_URL, TITLE_TEMPLATE, baseOpenGraph, indexingAllowed, siteVerification } from '@/lib/seo';

// Libre Caslon Text carries the headings and quoted reviews. Every Caslon
// selector is set at 400 and upright, so the bold and italic files were
// downloads nothing drew with.
const libreCaslon = Libre_Caslon_Text({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-libre-caslon',
  weight: '400',
});

// DM Sans for body copy, nav, labels and figures. It is a variable font, so one
// file covers every weight the stylesheet asks for. The italic is loaded
// because the body sets real italics — blockquotes, <em>, the office's own
// charges on the estimate — and without it the browser slants the upright.
const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${site.name} — Florida title insurance agency in ${site.address.city}`,
    template: TITLE_TEMPLATE,
  },
  description:
    `${site.legalName} is a Florida title insurance agency in ${site.address.city}. ` +
    `We close residential and commercial transactions throughout Florida, with in-office, ` +
    `mobile and remote online signings.`,
  // No canonical here. One set in the layout is inherited by any page that
  // forgets its own, the 404 included, and every one of them then names the
  // homepage as its canonical. Each page sets its own.
  openGraph: baseOpenGraph,
  // Without a twitter:image of its own, X falls back to og:image — which the
  // opengraph-image files generate for every route. This only picks the layout.
  twitter: { card: 'summary_large_image' },
  // Search Console and Bing Webmaster Tools. Absent until the tokens are set,
  // which should be on the real domain rather than the Vercel one.
  verification: siteVerification(),
  // robots.txt already closes a non-canonical deployment to crawlers, but a URL
  // that is linked from somewhere can be indexed without ever being fetched.
  // The meta tag is what refuses that, so the two say the same thing.
  //
  // Where indexing is allowed, no robots tag is written at all: index, follow
  // is what a page means without one, and a tag saying so would sit beside the
  // noindex Next adds to a 404 and contradict it. Google's snippet and preview
  // allowances go in its own tag, which says nothing about indexing.
  robots: indexingAllowed()
    ? { googleBot: { 'max-snippet': -1, 'max-image-preview': 'large' } }
    : { index: false, follow: false },
};

// Light only. Without it, Samsung Internet's automatic dark mode inverts the
// page, and the contrast the palette was checked at no longer holds.
export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${libreCaslon.variable} ${dmSans.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <OrganizationSchema />
        <SiteHeader />
        {/* Focusable so the skip link and the mobile menu can hand focus to the
            page itself, rather than leaving it on a link that has gone. */}
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
