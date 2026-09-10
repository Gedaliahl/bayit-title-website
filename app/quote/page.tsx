import type { Metadata } from 'next';
import Link from 'next/link';

import { getCounties } from '@/lib/locations';
import { site } from '@/lib/site';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { LeadForm } from '@/components/LeadForm';
import { AnswerPanel } from '@/components/Prose';

export const metadata: Metadata = {
  title: 'Request a closing cost quote',
  description:
    'Request an itemised Florida closing cost quote. Title insurance premiums in Florida are ' +
    'promulgated, so the premium is the same at any agency — the quote itemises everything else.',
  alternates: { canonical: '/quote' },
};

export default async function QuotePage() {
  const counties = await getCounties();

  return (
    <div className="frame section">
      <div className="measure">
        <Breadcrumbs
          trail={[
            { name: 'Home', path: '/' },
            { name: 'Request a quote', path: '/quote' },
          ]}
        />
        <h1 style={{ marginTop: '1.5rem' }}>Request a closing cost quote</h1>

        <AnswerPanel
          text={
            'Florida title insurance rates are promulgated by the Office of Insurance Regulation, ' +
            'so the premium for a given coverage amount is the same at every agency in the state. ' +
            'A quote is therefore about the other lines: search, examination, settlement fee, ' +
            'endorsements, recording, and documentary stamps, which vary by county and by deal.'
          }
        />

        <p>
          Send the county and the price and we will itemise it. If a figure depends on something we
          have not seen yet — a survey, an existing policy, an entity buyer — the quote will say so
          rather than average it out.
        </p>
        <p className="form-note">
          We are not publishing a calculator until every rate and fee behind it is tied to its
          source. Until then a person prepares the quote. See{' '}
          <Link href="/counties">counties we close in</Link> for what differs locally.
        </p>

        <LeadForm
          source="quote"
          showTransactionFields
          counties={counties.map((c) => ({ value: c.slug, label: c.name }))}
          submitLabel="Request the quote"
          successMessage={`Received. We will come back with an itemised quote, usually the same business day. If it is urgent, call ${site.phoneDisplay}.`}
        />
      </div>
    </div>
  );
}
