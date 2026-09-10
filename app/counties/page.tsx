import type { Metadata } from 'next';
import Link from 'next/link';

import { getCounties } from '@/lib/locations';
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

export default async function CountiesPage() {
  const counties = await getCounties();
  const priority = counties.filter((county) => county.isPriority);
  const rest = counties.filter((county) => !county.isPriority);

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
          and local mechanics: which side customarily pays for the owner&rsquo;s policy, what the
          clerk charges to record, how the property appraiser and tax collector publish their data,
          and how long a recording takes to post.
        </p>

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
