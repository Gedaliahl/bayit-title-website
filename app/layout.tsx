import type { Metadata } from 'next';
import { Newsreader, Archivo } from 'next/font/google';

import './globals.css';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { OrganizationSchema } from '@/components/Schema';
import { Analytics } from '@/components/Analytics';
import { site } from '@/lib/site';
import { SITE_URL, siteVerification } from '@/lib/seo';

// Newsreader for prose — this is a reading-heavy site.
const newsreader = Newsreader({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-newsreader',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
});

// Archivo for nav, labels and credential lines.
const archivo = Archivo({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-archivo',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${site.name} — Florida title insurance agency in ${site.address.city}`,
    template: `%s | ${site.name}`,
  },
  description:
    `${site.legalName} is a Florida title insurance agency in ${site.address.city}. ` +
    `We close residential and commercial transactions throughout Florida, with in-office, ` +
    `mobile and remote online signings.`,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: site.name,
    locale: 'en_US',
    url: SITE_URL,
  },
  // Without a twitter:image of its own, X falls back to og:image — which the
  // opengraph-image files generate for every route. This only picks the layout.
  twitter: { card: 'summary_large_image' },
  // Search Console and Bing Webmaster Tools. Absent until the tokens are set,
  // which should be on the real domain rather than the Vercel one.
  verification: siteVerification(),
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${archivo.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <OrganizationSchema />
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
