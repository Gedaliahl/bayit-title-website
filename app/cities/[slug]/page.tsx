// A city page: the county's figures, addressed to the place the reader typed.
//
// Nothing here is a fact about the city that the county page does not already
// stand behind. The premium is the state's, the deed stamps and recording are
// the county's, and who customarily pays is the county's custom. What the city
// page adds is the place — how a signing happens there, and what a municipal
// lien search has to cover — and it withholds, visibly, the one thing that is
// the municipality's own: where its building department publishes permit and
// code records. That is filled in when the team supplies and checks it.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { FLORIDA_CITIES, cityBySlug, cityPageTitle, citiesInCounty } from '@/lib/florida-cities';
import { getCounties, getLocation, recorderName } from '@/lib/locations';
import { getAllDocs, isPublishable } from '@/lib/content';
import { getReviews } from '@/lib/reviews';
import { formatLongDate } from '@/lib/seo';
import { site } from '@/lib/site';
import { LENDER_POLICY_BESIDE_RULE } from '@/lib/agency-charges';
import {
  CHECKED_ON,
  EXAMPLE_LOAN,
  EXAMPLE_PRICE,
  RECORDING_CHARGES,
  deedStampTax,
  deedStampTaxDue,
  discretionarySurtax,
  discretionarySurtaxDue,
  formatMoney,
  intangibleTaxDue,
  mortgageStampTaxDue,
} from '@/lib/statutory-rates';
import {
  CHECKED_ON as PREMIUM_CHECKED_ON,
  PREMIUM_RULE,
  SIMULTANEOUS_LOAN_PREMIUM,
  originalPremium,
  reissuePremium,
} from '@/lib/promulgated-premium';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { AnswerPanel, VerifyBanner } from '@/components/Prose';
import { CitedFigures } from '@/components/CitedFigures';
import { QuietCta } from '@/components/QuietCta';
import { ReviewList } from '@/components/Reviews';

export const dynamicParams = false;

// Only the cities whose county has a row: a city page renders its county's
// figures, and without Supabase the table falls back to the priority six.
export async function generateStaticParams() {
  const counties = await getCounties();
  return FLORIDA_CITIES.filter((city) => counties.some((county) => county.slug === city.countySlug)).map(
    (city) => ({ slug: city.slug }),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const city = cityBySlug(slug);
  if (!city) return {};
  const county = await getLocation(city.countySlug);
  const payer = county?.customaryOwnerPolicyPayer;

  return {
    title: cityPageTitle(city),
    description:
      `${site.legalName} is a Florida title company closing in ${city.name}` +
      (county ? `, ${county.name}` : '') +
      `. Title insurance, escrow and closings for residential and commercial property, ` +
      (payer ? `who customarily pays for the owner’s policy (the ${payer}), ` : '') +
      'the deed stamp rate, where the deed is recorded, and what a policy costs at every price.',
    alternates: { canonical: `/cities/${city.slug}` },
  };
}

export default async function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const city = cityBySlug(slug);
  if (!city) notFound();

  const county = await getLocation(city.countySlug);
  // A city whose county has no row would render figures attributed to nobody.
  // The seed has to carry the county first; see lib/florida-cities.ts.
  if (!county) notFound();

  const [docs, reviews] = await Promise.all([getAllDocs('title-problems'), getReviews()]);
  const localDocs = docs.filter((doc) => isPublishable(doc) && doc.counties.includes(county.slug));
  const localReviews = reviews.filter((review) => review.countySlug === county.slug).slice(0, 3);
  const neighbours = citiesInCounty(county.slug).filter((other) => other.slug !== city.slug);

  const payer = county.customaryOwnerPolicyPayer;
  const deedStamps = deedStampTax(county.slug);
  const surtax = discretionarySurtax(county.slug);
  const isHome = city.name === site.address.city;
  const recorder = recorderName(county);

  const openItems = [
    `Where the ${city.name} building department publishes permit and code enforcement records`,
    ...(payer || county.customaryOwnerPolicyDetail
      ? []
      : [`Who customarily pays for the owner’s policy in ${county.name}`]),
  ];

  return (
    <div className="frame section">
      <div className="measure">
        <Breadcrumbs
          trail={[
            { name: 'Home', path: '/' },
            { name: 'Counties', path: '/counties' },
            { name: county.name, path: `/counties/${county.slug}` },
            { name: city.name, path: `/cities/${city.slug}` },
          ]}
        />
        <h1 style={{ marginTop: '1.5rem' }}>Title insurance and closings in {city.name}</h1>

        <AnswerPanel
          text={
            `${site.legalName} is a Florida title company closing in ${city.name}, ${county.name}` +
            (isHome
              ? `, where our office is: ${site.address.street}. `
              : `, from our office in ${site.address.city}. `) +
            'We search and examine title, issue the policy, hold the escrow and run the closing ' +
            'for residential and commercial property, with signings ' +
            (isHome ? 'here in the office' : 'in our office') +
            `, wherever the signer is in ${city.name}, or by remote online notarization. ` +
            (payer
              ? `In ${county.name} the owner’s policy is customarily paid for by the ${payer}, ` +
                'though the contract controls. '
              : '') +
            'The premium is promulgated statewide; the deed stamp rate and the recording office ' +
            `are ${county.name}’s.`
          }
        />

        <VerifyBanner flags={openItems} variant="withheld" />

        <h2>What title insurance costs on a {city.name} purchase</h2>
        <p>
          Florida title insurance premiums are set by the Office of Insurance Regulation under{' '}
          <a href={PREMIUM_RULE.authorityUrl} rel="nofollow">
            {PREMIUM_RULE.authorityCite}
          </a>
          , so the premium on a {city.name} policy is the same figure it would be anywhere in the
          state. On a {formatMoney(EXAMPLE_PRICE)} purchase the owner&rsquo;s policy is{' '}
          <strong>{formatMoney(originalPremium(EXAMPLE_PRICE))}</strong>; where the reissue
          conditions in the rule are met it is {formatMoney(reissuePremium(EXAMPLE_PRICE))}; and a
          lender&rsquo;s policy issued at the same time for the same or a lesser amount is{' '}
          {formatMoney(SIMULTANEOUS_LOAN_PREMIUM)}. {LENDER_POLICY_BESIDE_RULE}
        </p>
        <p>
          <Link href={`/counties/${county.slug}`}>The {county.name} page</Link> prints the whole
          schedule with the rule beside it, and{' '}
          <Link href="/estimate">the estimate page</Link> prices a specific {city.name} address off
          the {county.name} property appraiser&rsquo;s record.
        </p>

        <h2>Who pays for the owner&rsquo;s policy in {city.name}?</h2>
        {payer ? (
          <p>
            Custom in {county.name}, and so in {city.name}, is that the <strong>{payer}</strong>{' '}
            pays for the owner&rsquo;s policy. Custom is not law: the purchase contract decides it,
            and in a negotiated deal either side can end up paying. Read the contract before assuming
            which line it falls on.
          </p>
        ) : county.customaryOwnerPolicyDetail ? (
          <p>
            {county.customaryOwnerPolicyDetail} Custom is not law: the purchase contract decides it.
            Read the contract before assuming which line it falls on.
          </p>
        ) : (
          <p>
            Local custom for {county.name} has not been confirmed against a source we are willing to
            publish, so this page does not state it. The purchase contract decides who pays in any
            event. Ask us on a specific file and we will tell you what we are seeing.
          </p>
        )}
        {county.customaryOwnerPolicyPayerSourceName ? (
          <p className="muted">
            That is the custom as published by{' '}
            {county.customaryOwnerPolicyPayerSourceUrl ? (
              <a href={county.customaryOwnerPolicyPayerSourceUrl} rel="nofollow">
                {county.customaryOwnerPolicyPayerSourceName}
              </a>
            ) : (
              county.customaryOwnerPolicyPayerSourceName
            )}
            {county.customaryOwnerPolicyPayerCheckedOn
              ? `, read on ${formatLongDate(county.customaryOwnerPolicyPayerCheckedOn)}`
              : ''}
            . It is a report of what is usual, not a rule, and not a promise about your contract.
          </p>
        ) : null}

        <h2>Documentary stamp tax on a {city.name} sale</h2>
        <p>
          The deed is taxed by the state at the rate that applies in {county.name}.{' '}
          {surtax
            ? `${county.name} is the one Florida county with a different deed rate, and it levies a surtax the other 66 do not.`
            : 'This is the rate in 66 of the 67 counties; Miami-Dade is the exception.'}
        </p>

        <CitedFigures figures={surtax ? [deedStamps, surtax] : [deedStamps]} />

        <p>
          On a {formatMoney(EXAMPLE_PRICE)} {city.name} sale that is{' '}
          <strong>{formatMoney(deedStampTaxDue(EXAMPLE_PRICE, county.slug))}</strong> in deed stamps
          {surtax
            ? `, plus ${formatMoney(discretionarySurtaxDue(EXAMPLE_PRICE, county.slug))} in surtax if what is conveyed is anything other than a single-family residence`
            : ''}
          . A {formatMoney(EXAMPLE_LOAN)} mortgage carries{' '}
          {formatMoney(mortgageStampTaxDue(EXAMPLE_LOAN))} in mortgage stamps and{' '}
          {formatMoney(intangibleTaxDue(EXAMPLE_LOAN))} in intangible tax, and a cash purchase
          carries neither. Which side pays each is decided by the purchase contract.
        </p>

        <h2>Where a {city.name} deed is recorded</h2>
        <p>
          {city.name} is in {county.name}, so the deed and mortgage are recorded with the{' '}
          {county.clerkUrl ? (
            <a href={county.clerkUrl} rel="nofollow">
              {recorder}
            </a>
          ) : (
            recorder
          )}
          , not with the city. Recording is charged by the page at a rate the statute sets for every
          clerk in Florida:
        </p>

        <CitedFigures figures={RECORDING_CHARGES} />

        {county.recordingTurnaround ? (
          <>
            <p>On turnaround, the {recorder} publishes this:</p>
            <blockquote>
              {county.recordingTurnaround}
              <footer>
                <a href={county.recordingTurnaroundSourceUrl!} rel="nofollow">
                  Read from the office&rsquo;s own page
                </a>
                {county.recordingTurnaroundCheckedOn
                  ? ` on ${county.recordingTurnaroundCheckedOn}`
                  : ''}
              </footer>
            </blockquote>
            <p>
              That is the office&rsquo;s published statement, not a time we can promise. On a file
              where the recording date matters, ask us what the office is actually doing that week.
            </p>
          </>
        ) : (
          <p>
            This office does not publish a statement about how long recording takes, so we do not
            print one. On a file with a tight timeline, ask us what the office is doing that week.
          </p>
        )}

        <h2>The municipal lien search in {city.name}</h2>
        <p>
          A title search reads the county&rsquo;s official records. It does not show what the City
          of {city.name} knows about the property: open or expired permits, code enforcement cases,
          unpaid utility balances and special assessments. Those are found by a separate municipal
          lien search directed to the city itself, and we order one on every file. What it turns up
          goes to you in writing, with what clearing it would take, as soon as it comes back.
        </p>

        <h2>How a signing happens in {city.name}</h2>
        <p>
          {isHome
            ? `Our office is in ${city.name}, at ${site.address.street}, so a signing here is at our table. `
            : `A ${city.name} signer can come to our office in ${site.address.city}, or we send a notary to them — a kitchen table, an office, wherever they are. `}
          Remote online notarization is the third way, for a signer who is not in {city.name} on the
          day. The closer who prepared the file is reachable during the signing whichever way it
          happens.
        </p>

        <p className="muted">
          Premium read from {PREMIUM_RULE.cite} on {formatLongDate(PREMIUM_CHECKED_ON)}. Taxes and
          recording charges read from the statutes on {formatLongDate(CHECKED_ON)} and linked line
          by line above. Tell us if a figure here does not match what you are quoted and we will
          check it against the source again.
        </p>

        {localDocs.length > 0 ? (
          <section>
            <h2>Title problems we have written about in {county.name}</h2>
            <ul className="linklist">
              {localDocs.map((doc) => (
                <li key={doc.slug}>
                  <Link href={`/title-problems/${doc.slug}`}>{doc.title}</Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {neighbours.length > 0 ? (
          <section>
            <h2>Elsewhere in {county.name}</h2>
            <ul className="linklist">
              {neighbours.map((other) => (
                <li key={other.slug}>
                  <Link href={`/cities/${other.slug}`}>Title company in {other.name}</Link>
                </li>
              ))}
              <li>
                <Link href={`/counties/${county.slug}`}>The {county.name} page</Link>
              </li>
            </ul>
          </section>
        ) : null}

        {localReviews.length > 0 ? (
          <section>
            <h2>Reviews from {county.name} files</h2>
            <ReviewList reviews={localReviews} />
          </section>
        ) : null}

        <QuietCta
          text={`Send us the address and the contract date on a ${city.name} file and we will tell you what the search shows.`}
        />
      </div>
    </div>
  );
}
