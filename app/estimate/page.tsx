import type { Metadata } from 'next';
import Link from 'next/link';

import { getCounties } from '@/lib/locations';
import { ROLL_COUNTY_SLUGS } from '@/lib/property-lookup';
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
    'Type a Florida property address, pick the property, and see the assessed value from the ' +
    'county property appraiser with the title insurance premium, transfer taxes and recording ' +
    'priced on it — cited to the rule and the statute, with no form to fill in.',
  alternates: { canonical: '/estimate' },
};

/** "Broward, Palm Beach, Miami-Dade and Hillsborough". */
function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export default async function EstimatePage() {
  const counties = await getCounties();

  // Named from the registry rather than typed into the copy, so a county added
  // to lib/property-lookup.ts is a county this page stops leaving out.
  const rollCounties = listNames(
    counties
      .filter((county) => ROLL_COUNTY_SLUGS.includes(county.slug))
      .map((county) => county.name.replace(/ County$/, '')),
  );

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
            'Start typing the address and pick the property. In ' +
            rollCounties +
            ' the assessed value arrives with it, straight off the property ' +
            'appraiser’s published roll; everywhere else the address still names the county and ' +
            'you type the value in. From there this prices the promulgated title insurance ' +
            'premium, the documentary stamp tax and the recording charges — and the county ' +
            'decides the stamp rate, which is 60 cents per $100 in Miami-Dade and 70 everywhere ' +
            'else. Assessed value is a tax figure and usually sits below what a property sells ' +
            'for, so treat the result as a floor rather than a quote.'
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
        rollCountySlugs={ROLL_COUNTY_SLUGS}
      />

      <div className="measure">
        <h2>Where the assessed value comes from</h2>
        <p>
          In {rollCounties} the property appraiser publishes its certified roll as an open data
          service. Type an address in one of those counties, pick the property out of the list, and
          the figure in the box is that office&rsquo;s own, with the parcel number and a link to
          the record it came from printed underneath it. Nothing is estimated on the way: what you
          see is what the roll says.
        </p>
        <p>
          In the rest of Florida the list is built from the{' '}
          <a href="https://geocoding.geo.census.gov/geocoder/" rel="nofollow">
            U.S. Census Bureau geocoder
          </a>
          , which knows addresses and counties and nothing about value. There the box stays yours to
          fill in and the link beside it goes to the right property appraiser. We would rather leave
          it empty than fill it from a data broker&rsquo;s copy of a roll we cannot cite.
        </p>

        <h2>What the county changes, and what it does not</h2>
        <p>
          It does not change the premium. The Office of Insurance Regulation sets title insurance
          rates by rule under{' '}
          <a href={PREMIUM_RULE.authorityUrl} rel="nofollow">
            {PREMIUM_RULE.authorityCite}
          </a>
          , and the schedule runs the same in Pensacola as it does in Key West. What the county does
          change is the tax on the deed: documentary stamp tax is 70&cent; per $100 of consideration
          across Florida and 60&cent; in Miami-Dade, which never applied the ten-cent increase in
          ch. 92-317, and Miami-Dade adds a 45&cent; surtax on anything that is not a single-family
          residence.
        </p>
        <p>
          That tax is charged on the <em>consideration</em> — the price — and a page that starts
          from an address has no price in it. So the figures compute it on the appraiser&rsquo;s
          value instead, say so on every line that does it, and keep it in its own group away from
          the premium. On a sale above the assessed value, which is most sales, the real tax is
          higher.
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
          It is sent to this site while you type, and this site asks the county property appraiser
          and the Census geocoder about it. That is the whole of it: nothing is written down,
          nothing is emailed to the office, no cookie is set, and the request is a POST so the
          address does not end up in a server log the way a search in a URL would. Turn the page and
          there is no record you were here.
        </p>
        <p>
          There is no form on this page for the same reason there is no form on the calculator: the
          premium is the rule&rsquo;s, not ours, so there is nothing to trade for it. If you would
          rather send nothing at all, type the county in by hand — the figures are computed in your
          browser either way, and the address box is only there to save you a trip to the property
          appraiser.
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
