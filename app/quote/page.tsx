import type { Metadata } from 'next';
import Link from 'next/link';

import { getCounties } from '@/lib/locations';
import { site } from '@/lib/site';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { LeadForm } from '@/components/LeadForm';
import { AnswerPanel } from '@/components/Prose';
import { baseOpenGraph, metaDescription } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Request a closing cost quote',
  description: metaDescription(
    'Request an itemized Florida closing cost quote. The title premium is promulgated by the ' +
      'Office of Insurance Regulation; the quote itemizes everything else.',
  ),
  alternates: { canonical: '/quote' },
  openGraph: { ...baseOpenGraph, url: '/quote' },
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
            'so the premium for a given coverage amount comes straight off a published schedule. ' +
            'Recording charges and documentary stamp tax are set by statute and are the same ' +
            'statewide, Miami-Dade aside. A quote is therefore about the lines that do move: ' +
            'search, examination, our settlement fee, endorsements, and what the file turns up.'
          }
        />

        <p>
          Send the county and the price and we will itemise it. If a figure depends on something we
          have not seen yet — a survey, an existing policy, an entity buyer — the quote will say so
          rather than average it out.
        </p>

        <p>
          For the promulgated and statutory part on its own — premium, documentary stamps,
          intangible tax, recording — the{' '}
          <Link href="/estimate?mode=numbers">estimate page</Link> works it out without asking you
          for anything. If you have an address but not a price yet,{' '}
          <Link href="/estimate">estimate from the address</Link>: it prices the premium off the
          county and the assessed value the property appraiser publishes. If you have the contract,{' '}
          <Link href="/estimate?mode=upload">send it</Link> and we itemise everything, our fees
          included.
        </p>
        <p className="form-note">
          Neither tool prices the part that is ours rather than the rule&rsquo;s — our settlement
          fee, the search and examination, endorsements — so a person still prepares the quote. See{' '}
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
