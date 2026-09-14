import type { Metadata } from 'next';
import Link from 'next/link';

import { getCounties } from '@/lib/locations';
import { getCountyRates, getStatewideRates, formatRate, type Rate } from '@/lib/rates';
import { site } from '@/lib/site';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { QuietCta } from '@/components/QuietCta';

export const metadata: Metadata = {
  title: 'Counties we close in',
  description:
    'We close throughout Florida, with most files in Broward, Palm Beach and Miami-Dade. ' +
    'What differs county to county: who customarily pays for the owner’s policy, recording, and clerk practice.',
  alternates: { canonical: '/counties' },
};

/** A rate, but only if it is a county row rather than the statewide fallback. */
function countyRow(rate: Rate | null): Rate | null {
  return rate && rate.countySlug !== null ? rate : null;
}

export default async function CountiesPage() {
  const [counties, statewide, miamiDade] = await Promise.all([
    getCounties(),
    getStatewideRates(),
    // The one county whose deed tax departs from the statewide rate, so the
    // paragraph below names it from data rather than from memory.
    getCountyRates('miami-dade-county'),
  ]);
  const priority = counties.filter((county) => county.isPriority);
  const rest = counties.filter((county) => !county.isPriority);

  const firstPage = statewide.get('recording_first_page');
  const additionalPage = statewide.get('recording_additional_page');
  const deedStamps = statewide.get('tax_doc_stamps_deed');
  // Only name a Miami-Dade figure where the row really is a Miami-Dade row.
  // Without this, a missing override would silently print the statewide rate as
  // though it were the local one — the wrong number, stated confidently.
  const miamiDeedStamps = countyRow(miamiDade.get('tax_doc_stamps_deed'));
  const miamiSurtax = countyRow(miamiDade.get('tax_doc_stamps_surtax'));

  return (
    <div className="frame section">
      <div className="measure">
        <Breadcrumbs
          trail={[
            { name: 'Home', path: '/' },
            { name: 'Counties', path: '/counties' },
          ]}
        />
        <h1 style={{ marginTop: '1.5rem' }}>Counties we close in</h1>
        <p className="lede">
          We close throughout {site.serviceArea}, all 67 counties. Most of our files sit in{' '}
          {site.priorityCounties.slice(0, -1).join(', ')} and {site.priorityCounties.at(-1)}.
        </p>
        <p>
          The title work is the same statewide — the promulgated premium is set by the Florida Office
          of Insurance Regulation, not by the agency. What changes county to county is local custom
          and local mechanics: which side customarily pays for the owner&rsquo;s policy, which office
          holds the official records, how the property appraiser and tax collector publish their
          data, and how long a recording takes to post.
        </p>
        {firstPage && additionalPage && deedStamps ? (
          <p>
            Recording charges are not one of those things. Fla. Stat. § 28.24 caps what a recording
            office may charge — {formatRate(firstPage)} for the first page of a deed or mortgage and{' '}
            {formatRate(additionalPage)} for each page after it — so that figure is the same in all
            67 counties. The documentary stamp tax on the deed is {formatRate(deedStamps)} of the
            price everywhere except{' '}
            <Link href="/counties/miami-dade-county">Miami-Dade</Link>
            {miamiDeedStamps && miamiSurtax
              ? `, where it is ${formatRate(miamiDeedStamps)} and a discretionary surtax of ${formatRate(
                  miamiSurtax,
                )} applies to a transfer of anything other than a single-family residence`
              : ''}
            . Each county page carries the full table with its sources.
          </p>
        ) : null}

        <h2>Where most of our files are</h2>
        <ul className="linklist">
          {priority.map((county) => (
            <li key={county.slug}>
              <Link href={`/counties/${county.slug}`}>
                {county.name}
                {county.customaryOwnerPolicyPayer ? (
                  <span className="linklist__sub">
                    Owner&rsquo;s policy customarily paid by the {county.customaryOwnerPolicyPayer}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>

        {rest.length > 0 ? (
          <>
            <h2>Elsewhere in Florida</h2>
            <ul className="linklist">
              {rest.map((county) => (
                <li key={county.slug}>
                  <Link href={`/counties/${county.slug}`}>{county.name}</Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="form-note">
            Pages for the remaining counties are being written. We close in all of them — call or
            open an order for a county not listed here.
          </p>
        )}

        <QuietCta />
      </div>
    </div>
  );
}
