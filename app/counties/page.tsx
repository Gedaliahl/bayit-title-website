// Where we close, and the only honest answer to "is it cheaper in another
// county": the premium is promulgated and does not move, and everything the
// reader has heard about county-to-county difference is custom and mechanics.

import type { Metadata } from 'next';
import Link from 'next/link';

import { COUNTY_REGIONS, getCounties, type Location } from '@/lib/locations';
import { FLORIDA_COUNTIES, countySlugFor } from '@/lib/florida-counties';
import { deedStampTax, discretionarySurtax } from '@/lib/statutory-rates';
import { site } from '@/lib/site';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { QuietCta } from '@/components/QuietCta';
import { Verdict } from '@/components/Verdict';
import { Rail } from '@/components/Rail';

export const metadata: Metadata = {
  title: 'Florida title company by county and city',
  description:
    'A Florida title company closing in all 67 counties, with most files in Broward, Palm Beach, ' +
    'Miami-Dade, Hillsborough, Orange and Duval. County and city pages: who customarily pays for ' +
    'the owner’s policy, the deed stamp rate, recording, and what a policy costs.',
  alternates: { canonical: '/counties' },
};

const WHAT_CHANGES = [
  {
    title: 'Who pays for the owner’s policy',
    body:
      'Which side customarily pays is local custom, not law, and it is negotiable in the ' +
      'contract.',
  },
  {
    title: 'What the clerk charges to record',
    body:
      'And which office does the recording — in Orange it is the Comptroller rather than the ' +
      'Clerk of Courts.',
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
      `Deed doc stamps are ${deedStampTax(county.slug).amount.replace(
        ' of consideration, or part of $100',
        '',
      )} here, plus a ${surtax.amount.replace(
        ' of consideration, or part of $100',
        '',
      )} surtax on non-single-family property.`
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
            { term: 'Doc stamps', detail: '70¢ per $100; Miami-Dade 60¢ plus surtax' },
            { term: 'Recording', detail: 'The clerk’s fee and the clerk’s turnaround' },
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
                Every county has a page. Each states what the statute and the rule set, and holds
                back what only the recording office or this team can confirm.
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
        </div>
      </div>

      <QuietCta
        variant="band"
        text="Send us the address and we will tell you what the county’s record shows and what it will cost."
      />
    </div>
  );
}

/** "Broward County" reads as "Broward" in a list of six of them. */
function shortName(name: string): string {
  return name.replace(/\s+County$/, '');
}
