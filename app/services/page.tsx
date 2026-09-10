import type { Metadata } from 'next';
import Link from 'next/link';

import { getAllDocs } from '@/lib/content';
import { metaDescription } from '@/lib/seo';
import { site } from '@/lib/site';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { QuietCta } from '@/components/QuietCta';

export const metadata: Metadata = {
  title: 'Services',
  description:
    'Title search and examination, title insurance, settlement and escrow, and closings held ' +
    'in our office, wherever the signer is, or online — throughout Florida.',
  alternates: { canonical: '/services' },
};

export default async function ServicesIndex() {
  const docs = await getAllDocs('services');

  return (
    <div className="frame section">
      <div className="measure">
        <Breadcrumbs
          trail={[
            { name: 'Home', path: '/' },
            { name: 'Services', path: '/services' },
          ]}
        />
        <h1 style={{ marginTop: '1.5rem' }}>What we do</h1>
        <p className="lede">
          We search title, examine what the search returns, issue commitments and policies as an
          agent for {site.underwriter}, hold the escrow, and run the closing. Every file is worked
          by the same four people, in {site.address.city}.
        </p>

        <h2>How a signing can happen</h2>
        <ul>
          {site.closingMethods.map((method) => (
            <li key={method}>{method}</li>
          ))}
        </ul>
        <p className="muted ui" style={{ fontSize: '0.875rem' }}>
          Office hours are {site.hours[0].days} {site.hours[0].open} to {site.hours[0].close}, and{' '}
          {site.hours[1].days} {site.hours[1].open} to {site.hours[1].close}.
        </p>
      </div>

      {docs.length > 0 ? (
        <section style={{ marginTop: '3rem' }}>
          <h2 style={{ marginTop: 0 }}>Service pages</h2>
          <ul className="card-grid">
            {docs.map((doc) => (
              <li key={doc.slug} className="card">
                <h3>
                  <Link href={`/services/${doc.slug}`}>{doc.title}</Link>
                </h3>
                <p>{metaDescription(doc.summary ?? doc.direct_answer, 170)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="measure">
        <QuietCta />
      </div>
    </div>
  );
}
