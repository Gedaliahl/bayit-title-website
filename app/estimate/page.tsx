// What a closing costs, three ways: from an address, from the contract
// numbers, or from the contract itself. This replaced two pages — the address
// estimator here and the premium calculator at /calculator — with one, because
// a reader arriving with a question about cost should not have to know which
// of our tools answers it before they can ask.
//
// The arithmetic is lib/'s: the promulgated schedule, the statutory rates and
// the two estimators built on them. Nothing on this page prices anything on
// its own, and every figure is cited to whoever sets it: the rule, the section,
// or this office for the two charges that are ours.

import type { Metadata } from 'next';
import Link from 'next/link';

import { DETAIL, HERO, META, RAIL } from '@/content/estimate';
import { getCounties } from '@/lib/locations';
import { VALUE_COUNTIES, VALUE_COUNTY_SLUGS } from '@/lib/property-lookup';
import {
  CHECKED_ON as PREMIUM_CHECKED_ON,
  ORIGINAL_SCHEDULE,
  PREMIUM_RULE,
  REISSUE_SCHEDULE,
} from '@/lib/promulgated-premium';
import { REISSUE_CONDITIONS } from '@/lib/closing-estimate';
import { CHECKED_ON as STATUTE_CHECKED_ON } from '@/lib/statutory-rates';
import type { CitedFigure } from '@/lib/cited-figures';
import { siteOpenGraph, formatLongDate, metaDescription } from '@/lib/seo';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Rail } from '@/components/Rail';
import { EstimateModeProvider } from '@/components/estimate/EstimateMode';
import { RouterCard } from '@/components/estimate/RouterCard';
import { Estimator } from '@/components/estimate/Estimator';
import { EstimateCta } from '@/components/estimate/EstimateCta';

export const metadata: Metadata = {
  title: META.title,
  description: metaDescription(META.description),
  alternates: { canonical: '/estimate' },
  openGraph: { ...siteOpenGraph, url: '/estimate' },
};

/** "Broward, Palm Beach, Miami-Dade and Hillsborough". */
function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** The schedule as the rule prints it: bracket and rate, without the per-$1,000. */
function ScheduleCard({ title, figures }: { title: string; figures: CitedFigure[] }) {
  return (
    <div className="schedule-card">
      <p className="schedule-card__title">{title}</p>
      <dl className="schedule-card__rows">
        {figures.map((figure) => (
          <div key={figure.label}>
            <dt>{figure.label.replace(/ of liability$/, '')}</dt>
            <dd>{figure.amount.replace(/ per \$1,000$/, '')}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default async function EstimatePage() {
  const counties = await getCounties();

  // The county selector lists every county the locations table knows about,
  // plus any county the estimator can read a roll for. A reader who picks a
  // property in Lee has to be able to see Lee in the box the figures are for.
  const selectable = [
    ...counties.map((county) => ({
      slug: county.slug,
      name: county.name,
      propertyAppraiserUrl: county.propertyAppraiserUrl,
      // The same custom the county and city pages print. A county the roll can
      // be read for but the table has nothing on carries null, and the estimate
      // shows the owner's policy to both sides rather than picking one.
      customaryOwnerPolicyPayer: county.customaryOwnerPolicyPayer,
    })),
    ...VALUE_COUNTIES.filter((county) => !counties.some((known) => known.slug === county.slug)).map(
      (county) => ({
        slug: county.slug,
        name: county.name,
        propertyAppraiserUrl: null,
        customaryOwnerPolicyPayer: null,
      }),
    ),
  ];

  // Named from the registry rather than typed into the copy, so a county added
  // to lib/county-rolls.ts is a county this page stops leaving out.
  const valueCounties = listNames(VALUE_COUNTIES.map((county) => county.name.replace(/ County$/, '')));

  return (
    <EstimateModeProvider>
      <section className="frame page-hero">
        <div className="page-hero__copy">
          <Breadcrumbs
            trail={[
              { name: 'Home', path: '/' },
              { name: HERO.crumb, path: '/estimate' },
            ]}
          />
          <h1>{HERO.title}</h1>
          <p className="page-hero__lede">
            <strong>{HERO.kicker}</strong> {HERO.lede}
          </p>
          <p className="page-hero__meta">
            <span>
              <span className="page-hero__dot" aria-hidden="true" />
              {HERO.proof[0]}
            </span>
            <span>{HERO.proof[1]}</span>
          </p>
        </div>

        <RouterCard />
      </section>

      <Estimator counties={selectable} valueCountySlugs={VALUE_COUNTY_SLUGS} />

      <div className="frame cols">
        <Rail label={RAIL.label} items={RAIL.items} />

        <div className="detail">
          <section id="assessed-value">
            <h2>{DETAIL.assessedValue.title}</h2>
            <div className="prose prose--detail">
              <p>
                {DETAIL.assessedValue.p1}
                {DETAIL.assessedValue.p1Counties(valueCounties)}
              </p>
              <p>
                {DETAIL.assessedValue.p2a}
                <a href="https://floridarevenue.com/property/Pages/DataPortal.aspx" rel="nofollow">
                  {DETAIL.assessedValue.p2Link}
                </a>
                {DETAIL.assessedValue.p2b}
              </p>
              <p>{DETAIL.assessedValue.p3}</p>
            </div>
          </section>

          <section id="county">
            <h2>{DETAIL.county.title}</h2>
            <div className="prose prose--detail">
              <p>
                {DETAIL.county.p1a}
                <a href={PREMIUM_RULE.authorityUrl} rel="nofollow">
                  {PREMIUM_RULE.authorityCite}
                </a>
                {DETAIL.county.p1b}
              </p>
              <p>
                {DETAIL.county.p2a}
                <em>{DETAIL.county.p2em}</em>
                {DETAIL.county.p2b}
              </p>
            </div>
          </section>

          <section id="sides">
            <h2>{DETAIL.sides.title}</h2>
            <div className="prose prose--detail">
              <p>{DETAIL.sides.p1a}</p>
              <p>
                {DETAIL.sides.p2a}
                <em>{DETAIL.sides.p2em}</em>
                {DETAIL.sides.p2b}
              </p>
              <p>{DETAIL.sides.p3}</p>
              <p>
                {DETAIL.sides.p4a}
                <Link href="/closing-costs/buyer">{DETAIL.sides.p4Buyer}</Link>
                {DETAIL.sides.p4b}
                <Link href="/closing-costs/seller">{DETAIL.sides.p4Seller}</Link>
                {DETAIL.sides.p4c}
              </p>
            </div>
          </section>

          <section id="floor">
            <h2>{DETAIL.floor.title}</h2>
            <div className="prose prose--detail">
              <p>
                {DETAIL.floor.p1a}
                <em>{DETAIL.floor.p1em}</em>
                {DETAIL.floor.p1b}
              </p>
              <p>{DETAIL.floor.p2}</p>
            </div>
          </section>

          <section id="schedule">
            <h2>{DETAIL.schedule.title}</h2>
            <div className="prose prose--detail schedule__intro">
              <p>
                {DETAIL.schedule.intro1}
                <a href={PREMIUM_RULE.url} rel="nofollow">
                  {PREMIUM_RULE.cite}
                </a>
                {DETAIL.schedule.intro2}
              </p>
            </div>
            <div className="schedule-cards">
              <ScheduleCard title={DETAIL.schedule.original} figures={ORIGINAL_SCHEDULE} />
              <ScheduleCard title={DETAIL.schedule.reissue} figures={REISSUE_SCHEDULE} />
            </div>
            <p className="schedule__note">{DETAIL.schedule.simultaneous}</p>
            <p className="schedule__note">
              The premium at common prices is on the{' '}
              <Link href="/closing-costs/title-insurance-calculator">title insurance calculator</Link>,
              and the deed and mortgage stamps at common prices on the{' '}
              <Link href="/closing-costs/doc-stamp-calculator">doc stamp calculator</Link>.
            </p>
          </section>

          <section id="reissue">
            <h2>{DETAIL.reissue.title}</h2>
            <ol className="num-list">
              {REISSUE_CONDITIONS.map((condition, index) => (
                <li key={condition}>
                  <span className="num-list__numeral" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span>{condition}</span>
                </li>
              ))}
            </ol>
            <div className="prose prose--detail">
              <p className="muted">{DETAIL.reissue.notSure}</p>
              <p className="muted">
                {DETAIL.reissue.p2a}
                <a href={PREMIUM_RULE.url} rel="nofollow">
                  {DETAIL.reissue.p2Link}
                </a>
                {DETAIL.reissue.p2b}
              </p>
            </div>
          </section>

          <section id="unknowns">
            <div className="callout">
              <p className="callout__eyebrow">{DETAIL.unknowns.eyebrow}</p>
              <h2>{DETAIL.unknowns.title}</h2>
              <div className="prose prose--detail">
                <p>{DETAIL.unknowns.p1}</p>
                <p>{DETAIL.unknowns.p2}</p>
              </div>
            </div>
          </section>

          <section id="privacy">
            <h2>{DETAIL.privacy.title}</h2>
            <div className="prose prose--detail">
              <p>{DETAIL.privacy.p1}</p>
              <p>{DETAIL.privacy.p2}</p>
              <p>{DETAIL.privacy.p3}</p>
            </div>
            <p className="estimate-note">
              {DETAIL.privacy.note(
                PREMIUM_RULE.cite,
                formatLongDate(PREMIUM_CHECKED_ON),
                formatLongDate(PREMIUM_RULE.lastAmended),
                formatLongDate(STATUTE_CHECKED_ON),
              )}
            </p>
          </section>
        </div>
      </div>

      <EstimateCta />
    </EstimateModeProvider>
  );
}
