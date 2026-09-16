import type { Metadata } from 'next';
import Link from 'next/link';

import { getCounties } from '@/lib/locations';
import {
  CHECKED_ON as PREMIUM_CHECKED_ON,
  PREMIUM_RULE,
} from '@/lib/promulgated-premium';
import { REISSUE_CONDITIONS } from '@/lib/closing-estimate';
import { formatLongDate } from '@/lib/seo';
import { site } from '@/lib/site';
import { AddressEstimator } from '@/components/AddressEstimator';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { AnswerPanel } from '@/components/Prose';
import { QuietCta } from '@/components/QuietCta';

export const metadata: Metadata = {
  title: 'Estimate title insurance from a property address',
  description:
    'Type a Florida property address, take the assessed value from the county property ' +
    'appraiser, and see the promulgated title insurance premium on it — cited to the OIR rule, ' +
    'with no form to fill in.',
  alternates: { canonical: '/estimate' },
};

export default async function EstimatePage() {
  const counties = await getCounties();

  return (
    <div className="frame section">
      <div className="measure">
        <Breadcrumbs
          trail={[
            { name: 'Home', path: '/' },
            { name: 'Estimate from an address', path: '/estimate' },
          ]}
        />

        <h1 style={{ marginTop: '1.5rem' }}>
          Estimate title insurance from a property address
        </h1>

        <AnswerPanel
          text={
            'Start with the address. This works out the county, points you at that county’s ' +
            'property appraiser for the assessed value on the parcel, and prices the title ' +
            'insurance premium on it straight from the rate schedule the Office of Insurance ' +
            'Regulation promulgates. Assessed value is a tax figure and usually sits below what a ' +
            'property sells for, so treat the result as a floor rather than a quote.'
          }
        />
      </div>

      <AddressEstimator
        counties={counties.map((county) => ({
          slug: county.slug,
          name: county.name,
          propertyAppraiserUrl: county.propertyAppraiserUrl,
          customaryOwnerPolicyPayer: county.customaryOwnerPolicyPayer,
        }))}
      />

      <div className="measure">
        <h2>Why the address decides so little</h2>
        <p>
          It decides the county, and the county decides where you read the assessed value and which
          side customarily pays for the owner&rsquo;s policy. It does not decide the premium. The
          Office of Insurance Regulation sets title insurance rates by rule under{' '}
          <a href={PREMIUM_RULE.authorityUrl} rel="nofollow">
            {PREMIUM_RULE.authorityCite}
          </a>
          , and the schedule runs the same in Pensacola as it does in Key West. The figure is the
          rule&rsquo;s rather than anyone&rsquo;s opinion, which is the reason this page can do the
          arithmetic in your browser instead of asking you for your phone number first.
        </p>

        <h2>Why assessed value, and where it goes wrong</h2>
        <p>
          A policy is written for the full insurable value of the property — on a sale, the purchase
          price. Florida&rsquo;s <em>assessed</em> value is a tax figure. On homestead property the
          annual increase in assessed value is capped by the Save Our Homes provision, so a house
          held for years can be assessed far below what it would sell for today. Other exemptions
          and classifications pull it down further.
        </p>
        <p>
          That makes an assessed-value estimate useful and one-sided: the premium on the real
          coverage amount is usually higher than the figure above, rarely lower. If you have a
          contract price, use it — the{' '}
          <Link href="/calculator">calculator</Link> works from a price and a loan amount and adds
          documentary stamp tax, intangible tax and recording on top.
        </p>

        <h2>When does the reissue rate apply?</h2>
        <ul>
          {REISSUE_CONDITIONS.map((condition) => (
            <li key={condition}>{condition}</li>
          ))}
        </ul>
        <p className="muted">
          Not sure? Tick it and untick it. The difference is what it is worth digging the old policy
          out for, and we will check the rule against your file if you ask.
        </p>

        <h2>What happens to the address you typed</h2>
        <p>
          Nothing. It is read in your browser to guess at a county and is never sent to us, stored,
          or attached to anything. There is no form on this page for the same reason there is no
          form on the calculator: the premium is the rule&rsquo;s, not ours, so there is nothing to
          trade for it.
        </p>

        <p className="muted">
          Premium read from {PREMIUM_RULE.cite} on {formatLongDate(PREMIUM_CHECKED_ON)}; the rule
          was last amended {formatLongDate(PREMIUM_RULE.lastAmended)}. If a figure here does not
          match what you are quoted, tell us — either the rule moved or we have something to
          correct.
        </p>

        <QuietCta
          text={`Send the address and the contract price and ${site.name} will itemise the rest against the actual documents.`}
          action="Request a quote"
          href="/quote"
        />
      </div>
    </div>
  );
}
