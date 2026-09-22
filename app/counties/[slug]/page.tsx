import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  COUNTY_MARKETS,
  RECORDER_STATUTE,
  countyPageTitle,
  getCounties,
  getLocation,
  recorderName,
  turnaroundForQuote,
  type Location,
} from '@/lib/locations';
import { citiesInCounty } from '@/lib/florida-cities';
import { getAllDocs, isPublishable } from '@/lib/content';
import { getReviews } from '@/lib/reviews';
import { baseOpenGraph, fittedTitle, formatLongDate, metaDescription } from '@/lib/seo';
import { site } from '@/lib/site';
import {
  CHECKED_ON,
  DOR_DOC_STAMP_GUIDANCE,
  EXAMPLE_LOAN,
  EXAMPLE_PRICE,
  MORTGAGE_CHARGES,
  RECORDING_CHARGES,
  deedStampTax,
  deedStampTaxDue,
  discretionarySurtax,
  discretionarySurtaxDue,
  formatMoney,
  intangibleTaxDue,
  mortgageStampTaxDue,
  recordingChargeDue,
} from '@/lib/statutory-rates';
import { LENDER_POLICY_BESIDE_RULE } from '@/lib/agency-charges';
import { EXAMPLE_PAGE_COUNTS } from '@/lib/closing-estimate';
import {
  CHECKED_ON as PREMIUM_CHECKED_ON,
  MINIMUM_PREMIUM,
  NEW_HOME_MINIMUM_PREMIUM,
  ORIGINAL_SCHEDULE,
  PREMIUM_RULE,
  REISSUE_SCHEDULE,
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

export async function generateStaticParams() {
  return (await getCounties()).map((county) => ({ slug: county.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const county = await getLocation(slug);
  if (!county) return {};

  const payer = county.customaryOwnerPolicyPayer;

  return {
    title: fittedTitle(countyPageTitle(county), `Title company in ${county.name}, FL`),
    // What the page answers, in the order it answers it. The firm's name is
    // left to the title, where a results page shows it anyway.
    description: metaDescription(
      `Closings in ${county.name}: who customarily pays for the owner’s policy` +
        (payer ? ` (the ${payer})` : '') +
        ', the deed stamp rate, recording, and what a policy costs.',
    ),
    alternates: { canonical: `/counties/${county.slug}` },
    openGraph: { ...baseOpenGraph, url: `/counties/${county.slug}` },
  };
}

export default async function CountyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const county = await getLocation(slug);
  if (!county) notFound();

  const [docs, reviews] = await Promise.all([getAllDocs('title-problems'), getReviews()]);
  // A draft is unreachable in production, so a link to one is a link to a 404.
  const localDocs = docs.filter((doc) => isPublishable(doc) && doc.counties.includes(county.slug));
  const cities = citiesInCounty(county.slug);
  const market = COUNTY_MARKETS[county.slug];
  const localReviews = reviews.filter((review) => review.countySlug === county.slug).slice(0, 3);

  const payer = county.customaryOwnerPolicyPayer;

  // Premium, transfer taxes and recording charges are all set by an authority
  // outside this office — an OIR rule and three chapters of the statutes — so
  // they are stated below and cited, not withheld. The only thing a county page
  // still has to hold back is this clerk's own turnaround, where the office
  // publishes none.
  const deedStamps = deedStampTax(county.slug);
  const surtax = discretionarySurtax(county.slug);

  // Each is cleared only where a source clears it: the team stating the custom
  // it sees on its files, the recording office's own page, the office's own
  // words on turnaround. Most Florida counties publish nothing on turnaround,
  // and for those the flag stands.
  const openItems = [
    ...(payer || county.customaryOwnerPolicyDetail
      ? []
      : ['Who customarily pays for the owner’s policy in this county']),
    ...(county.clerkUrl ? [] : ['The recording office’s own page and fee schedule']),
    ...(county.recordingTurnaround ? [] : ['Typical recording turnaround at this clerk']),
  ];

  return (
    <div className="frame section">
      <div className="measure">
        <Breadcrumbs
          trail={[
            { name: 'Home', path: '/' },
            { name: 'Counties', path: '/counties' },
            { name: county.name, path: `/counties/${county.slug}` },
          ]}
        />
        <h1 style={{ marginTop: '1.5rem' }}>
          Title insurance and closings in {county.name}
        </h1>

        <AnswerPanel
          text={
            `${site.legalName} is a Florida title company closing in ${county.name}` +
            (market ? `, ${market} included,` : '') +
            ` from our office in ${site.address.city}: residential and commercial title, ` +
            'escrow and settlement, with signings in our office, wherever the signer is, or by ' +
            'remote online notarization. ' +
            (payer
              ? `In ${county.name} the owner’s title policy is customarily paid for by the ${payer}, ` +
                'though the contract controls and the parties can agree otherwise. '
              : '') +
            'Title insurance premiums in Florida are promulgated by the Office of Insurance ' +
            'Regulation; what differs county to county is local custom and recording practice.'
          }
        />

        <VerifyBanner flags={openItems} variant="withheld" />

        <h2>Who pays for the owner&rsquo;s policy in {county.name}?</h2>
        {payer ? (
          <>
            <p>
              Custom in {county.name} is that the <strong>{payer}</strong> pays for the
              owner&rsquo;s policy. Custom is not law. The purchase contract decides it, and in a
              negotiated deal either side can end up paying. Read the contract before assuming which
              line it falls on.
            </p>
            <PayerSource county={county} />
          </>
        ) : county.customaryOwnerPolicyDetail ? (
          <>
            <p>{county.customaryOwnerPolicyDetail}</p>
            <p>
              Custom is not law. The purchase contract decides it, and in a negotiated deal either
              side can end up paying. Read the contract before assuming which line it falls on.
            </p>
            <PayerSource county={county} />
          </>
        ) : (
          <p>
            Local custom for this county has not been confirmed against a source we are willing to
            publish. The purchase contract decides who pays in any event. Ask us on a specific file
            and we will tell you what we are seeing.
          </p>
        )}

        <h2>What does the premium cost?</h2>
        <p>
          Florida title insurance premiums are promulgated: the Office of Insurance Regulation sets
          them by rule under{' '}
          <a href={PREMIUM_RULE.authorityUrl} rel="nofollow">
            {PREMIUM_RULE.authorityCite}
          </a>
          . The schedule below is that rule&rsquo;s, not ours, which is why it is printed here
          rather than kept behind a form: you can open the rule and arrive at the same number.
        </p>
        <p>
          The rate runs per $1,000 of liability, and an owner&rsquo;s policy is written for the full
          insurable value of the property:
        </p>

        <CitedFigures figures={ORIGINAL_SCHEDULE} />

        <p>
          So a {formatMoney(EXAMPLE_PRICE)} purchase in {county.name} is{' '}
          <strong>{formatMoney(originalPremium(EXAMPLE_PRICE))}</strong> — the{' '}
          {ORIGINAL_SCHEDULE[0].label.toLowerCase()} at {ORIGINAL_SCHEDULE[0].amount} and the rest
          at {ORIGINAL_SCHEDULE[1].amount}. The minimum premium on
          a conveyance is {formatMoney(MINIMUM_PREMIUM)}, and a fraction of $100 counts as a full
          $100 before the arithmetic starts.
        </p>
        <p>Three things in the same rule move that figure, and each is worth asking about:</p>
        <ul>
          <li>
            <strong>The reissue rate</strong>, where the owner&rsquo;s or the seller&rsquo;s own
            title was insured and both we and the underwriter hold a copy of that policy. The
            common case is a new policy dated less than three years after the one that insured the
            owner or seller. It is a different schedule, not a discount on this one:{' '}
            {formatMoney(reissuePremium(EXAMPLE_PRICE))} on the same{' '}
            {formatMoney(EXAMPLE_PRICE)} purchase, or{' '}
            {formatMoney(originalPremium(EXAMPLE_PRICE) - reissuePremium(EXAMPLE_PRICE))} less.
          </li>
          <li>
            <strong>Simultaneous issue.</strong> Where a lender&rsquo;s policy is issued at the same
            time as the owner&rsquo;s policy on the same land, the lender&rsquo;s policy is{' '}
            {formatMoney(SIMULTANEOUS_LOAN_PREMIUM)} for coverage up to the owner&rsquo;s amount.
            Anything above that amount is charged at the regular rate.{' '}
            {LENDER_POLICY_BESIDE_RULE}
          </li>
          <li>
            <strong>The new home purchase discount</strong>, on the first sale of a newly built one-
            to four-family home the seller has neither leased nor occupied: the premium is reduced
            by what was paid for the builder&rsquo;s loan policy, with a floor of{' '}
            {formatMoney(NEW_HOME_MINIMUM_PREMIUM)}. It cannot be combined with the reissue rate.
          </li>
        </ul>

        <p>The reissue schedule, in full:</p>

        <CitedFigures figures={REISSUE_SCHEDULE} />

        <p>
          <Link href="/estimate?mode=numbers">
            Work the premium, tax and recording out for a specific price
          </Link>{' '}
          — the estimate page uses this schedule and cites the same rule.
        </p>
        <p>
          What each side pays, line by line, is on the{' '}
          <Link href="/closing-costs/buyer">buyer closing costs</Link> and{' '}
          <Link href="/closing-costs/seller">seller closing costs</Link> pages.
        </p>

        <p className="muted">
          Read from {PREMIUM_RULE.cite} on {formatLongDate(PREMIUM_CHECKED_ON)}. The rule was last
          amended {formatLongDate(PREMIUM_RULE.lastAmended)}. Tell us if a figure here does not
          match what you are quoted and we will check it against the rule again.
        </p>

        <h2>Documentary stamp tax on a {county.name} sale</h2>
        <p>
          The deed is taxed by the state, not by the county.{' '}
          {surtax
            ? `${county.name} is the one county that does not pay the statewide rate: the 10-cent ` +
              'increase the Legislature added in 1992 was never applied here, and the county levies ' +
              'a surtax the other 66 do not.'
            : 'The rate below is the rate in 66 of the 67 counties — Miami-Dade is the exception.'}{' '}
          The tax is charged on each part of $100, so it rounds up.
        </p>

        <CitedFigures figures={surtax ? [deedStamps, surtax] : [deedStamps]} />

        <p>
          On a {formatMoney(EXAMPLE_PRICE)} sale that is{' '}
          <strong>{formatMoney(deedStampTaxDue(EXAMPLE_PRICE, county.slug))}</strong> in deed
          stamps
          {surtax
            ? `, plus ${formatMoney(discretionarySurtaxDue(EXAMPLE_PRICE, county.slug))} in ` +
              'surtax if what is being conveyed is anything other than a single-family residence'
            : ''}
          . Which side pays it is decided by the purchase contract, not by the statute.
        </p>

        <p>A mortgage is taxed separately, so a cash closing carries neither of these:</p>

        <CitedFigures figures={MORTGAGE_CHARGES} />

        <p>
          On a {formatMoney(EXAMPLE_LOAN)} loan that is{' '}
          <strong>{formatMoney(mortgageStampTaxDue(EXAMPLE_LOAN))}</strong> in mortgage stamps
          and <strong>{formatMoney(intangibleTaxDue(EXAMPLE_LOAN))}</strong> in intangible tax.
        </p>

        <h2>Recording</h2>
        <p>
          Deeds and mortgages are recorded with the{' '}
          {county.clerkUrl ? (
            <a href={county.clerkUrl} rel="nofollow">
              {recorderName(county)}
            </a>
          ) : (
            recorderName(county)
          )}
          {county.clerkName ? (
            '.'
          ) : (
            <>
              , which is the recorder in every Florida county unless the county has placed the duty
              elsewhere —{' '}
              <a href={RECORDER_STATUTE.url} rel="nofollow">
                {RECORDER_STATUTE.cite}
              </a>
              . We have not yet linked this office&rsquo;s own recording page here.
            </>
          )}
          {county.eRecordingAvailable
            ? ' We e-record in this county, so a document usually posts without a courier trip.'
            : ''}{' '}
          Recording turnaround affects when a policy can issue, so it is worth knowing on a file
          with a tight timeline.
        </p>

        <p>
          What recording costs is set by statute and is charged by the page, so it is the same at
          every clerk in Florida — a {county.name} deed and a Levy County deed of the same length
          record for the same money:
        </p>

        <CitedFigures figures={RECORDING_CHARGES} />

        <p>
          A {EXAMPLE_PAGE_COUNTS.deed}-page deed is{' '}
          {formatMoney(recordingChargeDue(EXAMPLE_PAGE_COUNTS.deed))} and a{' '}
          {EXAMPLE_PAGE_COUNTS.mortgage}-page mortgage is{' '}
          {formatMoney(recordingChargeDue(EXAMPLE_PAGE_COUNTS.mortgage))}. The clerk&rsquo;s own fee schedule covers the
          other things the office does — certified copies, searches, its own e-recording
          arrangements — and a third-party e-recording vendor may add a fee of its own, which is
          not the clerk&rsquo;s charge and not this.
        </p>

        <p className="muted">
          Every figure in the two sections above was read from the statute that sets it on{' '}
          {formatLongDate(CHECKED_ON)} and is linked to that section. The one point not settled by
          the statute&rsquo;s own words is which county ch. 83-220 describes; that comes from the{' '}
          <a href={DOR_DOC_STAMP_GUIDANCE} rel="nofollow">
            Department of Revenue&rsquo;s documentary stamp tax guidance
          </a>
          . Rates change by act of the Legislature — if one of these no longer matches what you are
          being charged, tell us and we will correct it.
        </p>

        {county.recordingTurnaround ? (
          <>
            <p>
              On turnaround, the{' '}
              {recorderName(county)} publishes this:
            </p>
            <blockquote>
              {turnaroundForQuote(county.recordingTurnaround)}
              <footer>
                {county.recordingTurnaroundSourceUrl ? (
                  <a href={county.recordingTurnaroundSourceUrl} rel="nofollow">
                    Read from the office&rsquo;s own page
                  </a>
                ) : (
                  'Read from the office’s own page'
                )}
                {county.recordingTurnaroundCheckedOn
                  ? ` on ${formatLongDate(county.recordingTurnaroundCheckedOn)}`
                  : ''}
              </footer>
            </blockquote>
            <p>
              That is the office&rsquo;s own published statement, not a commitment it makes to us or
              a time we can promise you. Offices change these pages without notice. On a file where
              the recording date matters, ask us and we will check what the office is actually doing
              that week.
            </p>
          </>
        ) : null}

        {cities.length > 0 ? (
          <section>
            <h2>Cities in {county.name} we have written about</h2>
            <p>
              The premium, the taxes and the recording office are the county&rsquo;s, so the
              figures on these pages are the ones above. What each page adds is the place: how a
              signing happens there and what a municipal lien search has to cover.
            </p>
            <ul className="linklist">
              {cities.map((city) => (
                <li key={city.slug}>
                  <Link href={`/cities/${city.slug}`}>Title company in {city.name}</Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <h2>How Bayit Title handles a {county.name} file</h2>
        <p>
          The file is opened by the same four people who close it. We order the search, examine what
          comes back, and put anything that could hold up the closing in writing — with what it
          would take to clear it — rather than waiting for it to surface at the table. Signings
          happen in our {site.address.city} office, wherever the signer is, or by remote online
          notarization.
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

        {localReviews.length > 0 ? (
          <section>
            <h2>Reviews from {county.name} files</h2>
            <ReviewList reviews={localReviews} />
          </section>
        ) : null}

        <QuietCta
          text={`Send us the address and the contract date on a ${county.name} file and we will tell you what the search shows.`}
        />
      </div>
    </div>
  );
}

/**
 * Whose statement the custom is. A county custom is not law and, unless the
 * team stated it from its own files, not this office's observation either, so
 * the page names the publisher it is repeating and the date it was read.
 */
function PayerSource({
  county,
}: {
  county: Pick<
    Location,
    | 'customaryOwnerPolicyPayerSourceName'
    | 'customaryOwnerPolicyPayerSourceUrl'
    | 'customaryOwnerPolicyPayerCheckedOn'
  >;
}) {
  const name = county.customaryOwnerPolicyPayerSourceName;
  if (!name) return null;

  return (
    <p className="muted">
      That is the custom as published by{' '}
      {county.customaryOwnerPolicyPayerSourceUrl ? (
        <a href={county.customaryOwnerPolicyPayerSourceUrl} rel="nofollow">
          {name}
        </a>
      ) : (
        name
      )}
      {county.customaryOwnerPolicyPayerCheckedOn
        ? `, read on ${formatLongDate(county.customaryOwnerPolicyPayerCheckedOn)}`
        : ''}
      . It is a report of what is usual, not a rule, and not a promise about your contract.
    </p>
  );
}
