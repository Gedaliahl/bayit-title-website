// Where we close, and the only honest answer to "is it cheaper in another
// county": the premium is promulgated and does not move, and everything the
// reader has heard about county-to-county difference is custom and mechanics.

import type { Metadata } from 'next';
import Link from 'next/link';

import { COUNTY_REGIONS, getCounties, type Location } from '@/lib/locations';
import { FLORIDA_COUNTIES, countySlugFor } from '@/lib/florida-counties';
import { FLORIDA_CITIES } from '@/lib/florida-cities';
import { deedStampTax, discretionarySurtax } from '@/lib/statutory-rates';
import { site } from '@/lib/site';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { QuietCta } from '@/components/QuietCta';
import { Verdict } from '@/components/Verdict';
import { Rail } from '@/components/Rail';
import { baseOpenGraph, metaDescription } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Florida title company by county and city',
  description: metaDescription(
    'Florida closings in all 67 counties: who customarily pays for the owner’s policy, the deed ' +
      'stamp rate, recording, and what a policy costs.',
  ),
  alternates: { canonical: '/counties' },
  openGraph: { ...baseOpenGraph, url: '/counties' },
};

const WHAT_CHANGES = [
  {
    title: 'Who pays for the owner’s policy',
    body:
      'Which side customarily pays is local custom, not law, and it is negotiable in the ' +
      'contract.',
  },
  {
    title: 'Which office records',
    body:
      'In Orange it is the Comptroller rather than the Clerk of Courts. What recording costs is ' +
      'set by statute, the same at every office.',
  },
  {
    title: 'How the appraiser publishes data',
    body:
      'How the property appraiser and tax collector publish their records — which decides what ' +
      'an address estimate can read.',
  },
  {
    title: 'How long a recording takes to post',
    body: 'We publish an office’s own words on turnaround, or nothing — never an industry average.',
  },
];

/**
 * The one line under a county's name on its card.
 *
 * Every one of these is read off something the repository already stands
 * behind — the office address in lib/site.ts, the stamp rates in
 * lib/statutory-rates.ts, the recording office in the locations table. A county
 * with nothing sourced gets no line rather than a filler one, which is the same
 * rule the county pages themselves follow for turnaround.
 */
function countyNote(county: Location): string | null {
  if (county.slug === countySlugFor('Broward')) {
    return `Our office is here, in ${site.address.city}.`;
  }

  const surtax = discretionarySurtax(county.slug);
  if (surtax) {
    return (
      `Deed doc stamps are ${perHundred(deedStampTax(county.slug).amount)} here, plus a ` +
      `${perHundred(surtax.amount)} surtax on non-single-family property.`
    );
  }

  if (county.clerkName) return `Recording with the ${county.clerkName}.`;

  return null;
}

export default async function CountiesPage() {
  const counties = await getCounties();
  const priority = counties.filter((county) => county.isPriority);
  // The band carries the six busiest counties. The other sixty-one are linked
  // from the full list below.
  const bySlug = new Map(counties.map((county) => [county.slug, county]));
  // True on a complete build. A development build without Supabase has only the
  // priority counties, and the caption must not promise the other sixty-one.
  const everyCountyHasAPage = FLORIDA_COUNTIES.every((county) => bySlug.has(county.slug));
  // A city page renders its county's figures, so it exists only where the
  // county does — the same filter the city route's static params apply.
  const cities = FLORIDA_CITIES.filter((city) => bySlug.has(city.countySlug));

  return (
    <div>
      <section className="frame page-hero">
        <div className="page-hero__copy">
          <Breadcrumbs
            trail={[
              { name: 'Home', path: '/' },
              { name: 'Counties', path: '/counties' },
            ]}
          />
          <h1>Counties we close in</h1>
          <p className="page-hero__lede">
            We close throughout {site.serviceArea}, all {site.floridaCounties} counties. Most of our
            files sit in {site.priorityCounties.slice(0, -1).map(shortName).join(', ')} and{' '}
            {shortName(site.priorityCounties.at(-1)!)}. The title work is the same statewide; what
            changes is local custom and local mechanics.
          </p>
          <p className="page-hero__meta">
            <span>
              <span className="page-hero__dot" aria-hidden="true" />
              Office in {site.address.city}, Broward County
            </span>
            <span>Signings in office, mobile, or remote online</span>
          </p>
        </div>

        <Verdict
          eyebrow="Does the county change the price?"
          headline="The premium doesn’t. Custom does."
          rows={[
            { term: 'Premium', detail: `Promulgated — same in all ${site.floridaCounties}` },
            { term: 'Who pays', detail: 'Local custom, negotiable in the contract' },
            {
              term: 'Doc stamps',
              detail:
                `${perHundred(deedStampTax(countySlugFor('Broward')).amount)}; Miami-Dade ` +
                `${perHundred(deedStampTax(countySlugFor('Miami-Dade')).amount)} plus surtax`,
            },
            { term: 'Recording', detail: 'Set by statute; each office’s own turnaround' },
          ]}
          action={{
            prompt: 'Price a specific property',
            label: 'Estimate from an address',
            href: '/estimate',
          }}
        />
      </section>

      {priority.length > 0 ? (
        <section className="band">
          <div className="frame band__inner">
            <div className="band__head">
              <h2>Our busiest counties</h2>
              <span className="band__caption">
                {priority.length} counties with their own pages
              </span>
            </div>
            <ul className="band__grid band__grid--3 band__grid--links">
              {priority.map((county) => {
                const note = countyNote(county);
                return (
                  <li key={county.slug}>
                    <Link href={`/counties/${county.slug}`} className="step-card step-card--link">
                      {COUNTY_REGIONS[county.slug] ? (
                        <span className="step-card__label">{COUNTY_REGIONS[county.slug]}</span>
                      ) : null}
                      <span className="step-card__title step-card__title--serif">{county.name}</span>
                      {note ? <span className="step-card__body">{note}</span> : null}
                      <span className="step-card__more">County page →</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}

      <div className="frame cols">
        <Rail
          label="The detail"
          items={[
            { id: 'changes', label: 'What changes county to county' },
            { id: 'same', label: 'What does not' },
            { id: 'elsewhere', label: 'Elsewhere in Florida' },
            ...(cities.length > 0 ? [{ id: 'cities', label: 'Cities' }] : []),
          ]}
        />

        <div className="detail">
          <section id="changes">
            <h2>What changes county to county</h2>
            <ol className="num-cards">
              {WHAT_CHANGES.map((item, index) => (
                <li key={item.title} className="num-card">
                  <span className="num-card__number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <strong className="num-card__title">{item.title}</strong>
                  <span className="num-card__body">{item.body}</span>
                </li>
              ))}
            </ol>
          </section>

          <section id="same">
            <h2>What does not</h2>
            <div className="prose prose--detail">
              <p>
                The title work. The search is read the same way, the commitment lists the same kinds
                of requirements, and the policy is the same form on the same underwriter’s paper.
              </p>
            </div>
            <div className="callout">
              <p className="callout__eyebrow">The premium</p>
              <div className="prose prose--detail">
                <p>
                  The promulgated premium is set by the Florida Office of Insurance Regulation, not
                  by the agency. The schedule runs the same in Pensacola as it does in Key West, so
                  there is nothing to shop for on that line.
                </p>
              </div>
            </div>
          </section>

          <section id="elsewhere">
            <div className="section__head">
              <h2>Elsewhere in Florida</h2>
              <span className="caption">
                {everyCountyHasAPage ? 'Every county has a page. ' : null}Each county page states
                what the statute and the rule set, and holds back what only the recording office or
                this team can confirm.
              </span>
            </div>
            <ul className="county-list">
              {FLORIDA_COUNTIES.map((county) => {
                const record = bySlug.get(county.slug);
                const className = record?.isPriority ? 'county-list__priority' : undefined;
                return (
                  <li key={county.slug} className={className}>
                    {record ? (
                      <Link href={`/counties/${county.slug}`}>{county.name}</Link>
                    ) : (
                      county.name
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {cities.length > 0 ? (
            <section id="cities">
              <div className="section__head">
                <h2>Cities</h2>
                <span className="caption">
                  A city page carries its county&rsquo;s figures, addressed to the place.
                </span>
              </div>
              <ul className="county-list">
                {cities.map((city) => (
                  <li key={city.slug}>
                    <Link href={`/cities/${city.slug}`}>{city.name}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      <QuietCta
        variant="band"
        text="Send us the address and we will tell you what the county’s record shows and what it will cost."
      />
    </div>
  );
}

/** "70¢ per $100 of consideration, or part of $100" at the length of a card line. */
function perHundred(amount: string): string {
  return amount.replace(' of consideration, or part of $100', '');
}

/** "Broward County" reads as "Broward" in a list of six of them. */
function shortName(name: string): string {
  return name.replace(/\s+County$/, '');
}
