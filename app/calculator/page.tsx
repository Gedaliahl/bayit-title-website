import type { Metadata } from 'next';
import Link from 'next/link';

import { getCounties } from '@/lib/locations';
import {
  CHECKED_ON as PREMIUM_CHECKED_ON,
  ORIGINAL_SCHEDULE,
  PREMIUM_RULE,
  REISSUE_SCHEDULE,
} from '@/lib/promulgated-premium';
import { CHECKED_ON as STATUTE_CHECKED_ON } from '@/lib/statutory-rates';
import { formatLongDate } from '@/lib/seo';
import { site } from '@/lib/site';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { CitedFigures } from '@/components/CitedFigures';
import { AnswerPanel } from '@/components/Prose';
import { PremiumCalculator } from '@/components/PremiumCalculator';
import { QuietCta } from '@/components/QuietCta';

export const metadata: Metadata = {
  title: 'Florida title insurance premium calculator',
  description:
    'Work out the promulgated title insurance premium, documentary stamp tax, intangible tax ' +
    'and recording charges on a Florida closing. Every figure is cited to the OIR rule or the ' +
    'statute that sets it.',
  alternates: { canonical: '/calculator' },
};

/** Counties where the discretionary surtax question is worth asking. */
const SURTAX_COUNTIES = ['miami-dade-county'];

export default async function CalculatorPage() {
  const counties = await getCounties();

  return (
    <div className="frame section">
      <div className="measure">
        <Breadcrumbs
          trail={[
            { name: 'Home', path: '/' },
            { name: 'Premium calculator', path: '/calculator' },
          ]}
        />

        <h1 style={{ marginTop: '1.5rem' }}>What a Florida closing costs, before anyone&rsquo;s fee</h1>

        <AnswerPanel
          text={
            'Florida title insurance premiums are promulgated and the taxes and recording charges ' +
            'are statutory, so most of a closing statement is arithmetic anybody can check. This ' +
            'works out those figures for a specific price and loan, and cites the rule or the ' +
            'section behind each one. It is not a quote: our own fee and the search are not ' +
            'promulgated and are not in it.'
          }
        />
      </div>

      <PremiumCalculator
        counties={counties.map((county) => ({ slug: county.slug, name: county.name }))}
        surtaxCountySlugs={SURTAX_COUNTIES}
      />

      <div className="measure">
        <h2>Why the premium is the same everywhere</h2>
        <p>
          The Office of Insurance Regulation sets title insurance rates by rule under{' '}
          <a href={PREMIUM_RULE.authorityUrl} rel="nofollow">
            {PREMIUM_RULE.authorityCite}
          </a>
          . The schedule is the rule&rsquo;s, not ours, and it runs the same in every Florida
          county. That is the reason this page exists: the promulgated part of a closing statement
          is arithmetic anyone can check against the source, so it is printed here with the rule
          behind it rather than held behind a form.
        </p>

        <h2>The schedule it works from</h2>
        <p>Original rates, per $1,000 of liability:</p>

        <CitedFigures figures={ORIGINAL_SCHEDULE} />

        <p>Reissue rates, where the conditions above are met:</p>

        <CitedFigures figures={REISSUE_SCHEDULE} />

        <h2>What this does not know</h2>
        <p>
          It does not know your file. It assumes one deed and one mortgage, an owner&rsquo;s policy
          written at the purchase price, and a lender&rsquo;s policy issued at the same time on the
          same land. It does not price endorsements, and it cannot apply the new home purchase
          discount because that depends on the premium paid for the builder&rsquo;s loan policy —
          a figure only the prior policy shows. It knows nothing about prorations, association
          estoppels, municipal lien searches or what your lender charges.
        </p>
        <p>
          Send us the price, the county and the contract date and we will itemise the rest against
          the actual documents. If a figure here does not match what you are quoted, tell us:
          either the rule moved or we have something to correct.
        </p>

        <p className="muted">
          Premium read from {PREMIUM_RULE.cite} on {formatLongDate(PREMIUM_CHECKED_ON)}; the rule
          was last amended {formatLongDate(PREMIUM_RULE.lastAmended)}. Taxes and recording charges
          read from the statutes on {formatLongDate(STATUTE_CHECKED_ON)}. Both are linked line by
          line above, so nothing here has to be taken on our word.
        </p>

        <QuietCta
          text={`Send the county, the price and the contract date and ${site.name} will itemise the rest.`}
        />

        <p>
          <Link href="/quote">Request a full closing cost quote</Link>
        </p>
        <p>
          No contract price yet?{' '}
          <Link href="/estimate">Estimate the premium from a property address</Link> instead — that
          one works from the county and the assessed value on the property appraiser&rsquo;s record.
        </p>
      </div>
    </div>
  );
}
