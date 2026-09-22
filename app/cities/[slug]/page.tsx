// A city page: the county's figures, addressed to the place the reader typed,
// and the one thing a county page cannot say — what the city itself knows
// about a property.
//
// A title search reads the county's official records. A code enforcement
// case, an expired permit and an unpaid water bill live with the city, and
// they are found by a municipal lien search directed at the city. This page
// says how that works here: which office hears a code case, what turns a fine
// into a lien, how the lien is released, where permit status is searched and
// who answers the lien search. The statewide part is Chapter 162 of the
// statutes, quoted from lib/code-enforcement.ts. The local part is the city's
// own words, quoted from lib/municipal-records.ts with the URL each was read
// from. Where the city publishes nothing on a point the page says so at the
// top rather than filling it in.
//
// The closing figures — premium, deed stamps, recording, who customarily pays
// — are the county's, read off the same libraries the county page reads.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  FLORIDA_CITIES,
  POPULATION_SOURCE,
  cityBySlug,
  cityPageTitle,
  citiesInCounty,
  populationRank,
} from '@/lib/florida-cities';
import { municipalRecord, withheldMunicipalFacts, type CityQuote } from '@/lib/municipal-records';
import {
  ASSESSMENT_PRIORITY,
  BOARD_MAY_REDUCE,
  CHECKED_ON as CODE_CHECKED_ON,
  CITY_MAY_RELEASE,
  CODE_FINE_LIMITS,
  FINE_ACCRUES,
  FINE_FACTORS,
  HIGHER_LIMITS,
  LIEN_ATTACHES,
  ORDER_BINDS_PURCHASERS,
  RELEASE_COSTS,
  SPECIAL_MAGISTRATE,
  UTILITY_LIEN_LIMIT,
  type StatuteQuote,
} from '@/lib/code-enforcement';
import { getCounties, getLocation } from '@/lib/locations';
import { getAllDocs, isPublishable } from '@/lib/content';
import { getReviews } from '@/lib/reviews';
import { formatLongDate } from '@/lib/seo';
import { site } from '@/lib/site';
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
      `. What a municipal lien search finds in ${city.name} — code enforcement liens, open permits, ` +
      'utility balances — and how each is cleared before closing, ' +
      (payer ? `who customarily pays for the owner’s policy (the ${payer}), ` : '') +
      'the deed stamp rate, where the deed is recorded, and what a policy costs at every price.',
    alternates: { canonical: `/cities/${city.slug}` },
  };
}

/** A city's own words, with the page they were read from. */
function CityWords({ quote }: { quote: CityQuote }) {
  return (
    <blockquote>
      {quote.text}
      <footer>
        <a href={quote.sourceUrl} rel="nofollow">
          Read from the city&rsquo;s own page
        </a>{' '}
        on {formatLongDate(quote.checkedOn)}
      </footer>
    </blockquote>
  );
}

/** The statute's words, cited to the section. */
function StatuteWords({ quote }: { quote: StatuteQuote }) {
  return (
    <blockquote>
      {quote.text}
      <footer>
        <a href={quote.sourceUrl} rel="nofollow">
          {quote.cite}
        </a>
      </footer>
    </blockquote>
  );
}

function ordinal(n: number): string {
  const rest = n % 100;
  if (rest >= 11 && rest <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
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

  const record = municipalRecord(city.slug);
  // "City of Miami" as the city names itself; `the` in front where a sentence needs it.
  const government = record?.government ?? `City of ${city.name}`;
  const rank = populationRank(city);

  const payer = county.customaryOwnerPolicyPayer;
  const deedStamps = deedStampTax(county.slug);
  const surtax = discretionarySurtax(county.slug);
  const isHome = city.name === site.address.city;
  const recorder = county.clerkName ?? `${county.name} Clerk of Court`;

  const openItems = [
    ...withheldMunicipalFacts(city.name, record),
    ...(payer ? [] : [`Who customarily pays for the owner’s policy in ${county.name}`]),
  ];

  const building = record?.building ?? null;
  const code = record?.codeEnforcement ?? null;
  const lienSearch = record?.lienSearch ?? null;
  const utility = record?.utility ?? null;
  const other = record?.other ?? [];

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
        <p className="muted">
          {city.name} is Florida&rsquo;s {ordinal(rank)} most populous city, at{' '}
          {city.population.toLocaleString('en-US')} residents on{' '}
          <a href={POPULATION_SOURCE.url} rel="nofollow">
            the Census Bureau&rsquo;s {POPULATION_SOURCE.vintage} estimate
          </a>
          , and it is in {county.name}.
        </p>

        <AnswerPanel
          text={
            `${site.legalName} is a Florida title company closing in ${city.name}, ${county.name}` +
            (isHome
              ? `, where our office is: ${site.address.street}. `
              : `, from our office in ${site.address.city}. `) +
            'We search and examine title, issue the policy, hold the escrow and run the closing ' +
            'for residential and commercial property. On every file we also order a municipal lien ' +
            `search from the ${government}, because a code enforcement lien, an open permit or an ` +
            'unpaid utility balance is the city’s record, not the county’s, and the title search ' +
            'does not show it. What comes back goes to both sides in writing with what clearing it ' +
            'would take. ' +
            (payer
              ? `In ${county.name} the owner’s policy is customarily paid for by the ${payer}, ` +
                'though the contract controls. '
              : '') +
            'The premium is promulgated statewide; the deed stamp rate and the recording office ' +
            `are ${county.name}’s.`
          }
        />

        <VerifyBanner flags={openItems} variant="withheld" />

        <h2>What does a municipal lien search find in {city.name}?</h2>
        <p>
          The title search reads {county.name}&rsquo;s official records: deeds, mortgages, recorded
          judgments and recorded liens. It does not read the {government}&rsquo;s files. Four things
          live there and can attach to the property or hold up the closing: a code enforcement
          case and the fine it has become; a building permit that was opened and never closed, or
          work that was never permitted; a water, sewer or solid-waste balance; and a special
          assessment the city levied. A municipal lien search is the request to the city for all
          four, and we order one on every {city.name} file alongside the title search rather than
          waiting to see whether one is needed.
        </p>
        <p>
          A code enforcement order that has been recorded does show up in the county&rsquo;s
          records, and a title search finds it. The case behind it, the fine still running, and
          every case that has not been recorded yet do not. That is why the search goes to the
          city as well.
        </p>

        <h2>Who hears a code enforcement case in {city.name}?</h2>
        <p>
          Florida&rsquo;s Local Government Code Enforcement Boards Act, Chapter 162 of the
          statutes, is the framework every city here enforces its code under. A city may hear its
          cases before a code enforcement board or before a special magistrate, and the statute
          treats the two alike:
        </p>
        <StatuteWords quote={SPECIAL_MAGISTRATE} />
        {code ? (
          <>
            <p>
              In {city.name} the office is{' '}
              <a href={code.office.url} rel="nofollow">
                {code.office.name}
              </a>
              .{' '}
              {code.hearingBody
                ? 'On who hears the case, the city publishes this:'
                : 'Which body hears the case is not stated on the pages we read, so it is listed above as withheld.'}
            </p>
            {code.hearingBody ? <CityWords quote={code.hearingBody} /> : null}
          </>
        ) : (
          <p>
            Which {city.name} office runs code enforcement, and before whom, is not published on
            this page until it has been read from the city&rsquo;s own site. It is listed above as
            withheld.
          </p>
        )}
        <p>
          The statute sets the fines the hearing body may impose. It sets a default set of limits
          and lets a city of 50,000 people or more adopt a higher set by ordinance, and every city
          with a page here is over that line, so which set {city.name} uses is a question of its
          own ordinance:
        </p>
        <StatuteWords quote={HIGHER_LIMITS} />
        <CitedFigures figures={CODE_FINE_LIMITS} />

        <h2>How does a {city.name} code violation become a lien?</h2>
        <p>
          A violation is not a lien. A fine is not a lien either, until the city records the order
          that imposed it. What the statute says is this:
        </p>
        <StatuteWords quote={LIEN_ATTACHES} />
        <p>
          Two things in that sentence matter on a purchase. The lien is against the land where the
          violation is, so it follows the property to a buyer. And it is also against every other
          property the violator owns, so a seller&rsquo;s code lien on a different address can turn
          up against the one being sold. The recorded order itself binds a buyer, whether or not
          the fine has been recorded:
        </p>
        <StatuteWords quote={ORDER_BINDS_PURCHASERS} />
        {code?.liens ? (
          <>
            <p>The {government} puts it this way:</p>
            <CityWords quote={code.liens} />
          </>
        ) : null}

        <h2>How is a {city.name} code enforcement lien cleared before closing?</h2>
        <p>
          In the order the statute sets, and it is the order we work a file in. First the
          violation is corrected, because until it is the fine is still growing:
        </p>
        <StatuteWords quote={FINE_ACCRUES} />
        <p>
          Once the property complies, the hearing body issues an order acknowledging compliance,
          which is recorded like the original order was. Then the fine is dealt with. Only the city
          can release its own lien, and it may release it in full or accept less than the accrued
          amount:
        </p>
        <StatuteWords quote={CITY_MAY_RELEASE} />
        <p>
          The statute lets the hearing body reduce a fine, in one sentence, and says nothing that
          makes a reduction a right:
        </p>
        <StatuteWords quote={BOARD_MAY_REDUCE} />
        <p>
          A request to reduce speaks to the same factors the statute told the hearing body to weigh
          when it set the fine:
        </p>
        <StatuteWords quote={FINE_FACTORS} />
        <p>The city may add its recording and release costs to whatever is paid:</p>
        <StatuteWords quote={RELEASE_COSTS} />
        {code?.release ? (
          <>
            <p>The {government} publishes this about releasing or reducing a lien:</p>
            <CityWords quote={code.release} />
          </>
        ) : (
          <p>
            Whether the {government} has a published route for reducing or settling a lien, and what it
            asks for, is not stated here until it has been read from the city&rsquo;s own site. It
            is listed above as withheld.
          </p>
        )}
        <p>
          On a file, what that looks like is a written payoff or release figure from the city,
          paid at closing by whichever side the contract puts it on, and a release of lien recorded
          with the deed. A lien that cannot be released by the closing date is a conversation
          between the parties, in writing, before the date rather than at the table. One limit
          worth knowing: the statute forbids foreclosing a code lien on a homestead, but the lien
          still exists, still has to be cleared to insure the title, and still follows the property
          to a buyer who is not the homestead owner.
        </p>

        <h2>Open and expired permits in {city.name}</h2>
        <p>
          A permit that was issued and never received its final inspection stays open in the
          city&rsquo;s system, and after the period the building code allows it expires. Neither is
          a lien. Both are the city&rsquo;s record that the work was never signed off, and a lender,
          an insurer or the next buyer can ask about them at any time.{' '}
          {building ? (
            <>
              In {city.name} permits are the business of{' '}
              <a href={building.office.url} rel="nofollow">
                {building.office.name}
              </a>
              {building.portal ? (
                <>
                  , and a permit&rsquo;s status and history are searched in{' '}
                  <a href={building.portal.url} rel="nofollow">
                    {building.portal.name}
                  </a>
                </>
              ) : null}
              .
            </>
          ) : null}
        </p>
        {building?.expiredPermits ? (
          <>
            <p>On an expired permit, the city publishes this:</p>
            <CityWords quote={building.expiredPermits} />
          </>
        ) : null}
        <p>
          A close-out happens in one of a few ways, and which one depends on what the permit was
          for, how old it is and what the city still has outstanding: the seller or the contractor
          completes the inspections that were never called; the city closes the permit on the
          documentation already in its file; the work is permitted after the fact, with plans, fees
          and inspection following; something is corrected and then inspected; or, where the
          underwriter and the contract allow it, the closing proceeds with an escrow and the permit
          is closed afterwards. What any of that costs is not one number, and the permit type,
          the status of the work and the inspections outstanding are established before anyone is
          given an estimate.
        </p>

        <h2>Water, sewer and other city charges in {city.name}</h2>
        {utility ? (
          <p>
            Water and sewer inside {city.name} are billed by{' '}
            <a href={utility.provider.url} rel="nofollow">
              {utility.provider.name}
            </a>
            . The lien search asks for the balance on the account, and the final bill is settled at
            closing so the buyer starts service on a clean account.
          </p>
        ) : (
          <p>
            Who bills water and sewer inside {city.name} is not stated on this page until it has
            been read from the utility&rsquo;s own site; it is listed above as withheld. Whoever it
            is, the lien search asks for the balance on the account and the final bill is settled at
            closing.
          </p>
        )}
        {utility?.statement ? <CityWords quote={utility.statement} /> : null}
        <p>
          A former tenant&rsquo;s unpaid balance has a limit the statute puts on it, which matters
          on an investment property:
        </p>
        <StatuteWords quote={UTILITY_LIEN_LIMIT} />
        <p>
          A special assessment the city levied for an improvement is a different thing. It ranks
          with the tax lien, ahead of a mortgage, and the search asks for it by name:
        </p>
        <StatuteWords quote={ASSESSMENT_PRIORITY} />

        <h2>How is the lien search ordered from the {government}?</h2>
        {lienSearch?.answeredBy === 'self-service' ? (
          <>
            <p>
              The {government} publishes no lien-search or estoppel service of its own. What it
              publishes is self-service: its own lookups for permits and code cases, and a request
              to{' '}
              <a href={lienSearch.office.url} rel="nofollow">
                {lienSearch.office.name}
              </a>{' '}
              for the status of a specific permit. So the search here is assembled from those
              lookups, from the utility&rsquo;s account balance and from the county&rsquo;s records,
              rather than answered in one letter from the city.
            </p>
            {lienSearch.how ? (
              <>
                <p>On what the city offers a title search, it publishes this:</p>
                <CityWords quote={lienSearch.how} />
              </>
            ) : null}
          </>
        ) : lienSearch ? (
          <>
            <p>
              The search is answered by{' '}
              <a href={lienSearch.office.url} rel="nofollow">
                {lienSearch.office.name}
              </a>
              {lienSearch.answeredBy === 'county'
                ? ', which is a county office rather than the city itself'
                : lienSearch.answeredBy === 'vendor'
                  ? ', a vendor the city contracts to answer them'
                  : ''}
              .{' '}
              {lienSearch.how ? 'On how it is requested, the city publishes this:' : ''}
            </p>
            {lienSearch.how ? <CityWords quote={lienSearch.how} /> : null}
            {lienSearch.fee ? (
              <>
                <p>On the fee:</p>
                <CityWords quote={lienSearch.fee} />
              </>
            ) : null}
            {lienSearch.turnaround ? (
              <>
                <p>On how long it takes, which is the city&rsquo;s statement rather than a time we can promise:</p>
                <CityWords quote={lienSearch.turnaround} />
              </>
            ) : (
              <p>
                The city does not publish how long a search takes, so we do not print a number. It
                is ordered the day the file opens, which is the one part of the timing that is
                ours.
              </p>
            )}
          </>
        ) : (
          <p>
            Which office answers a lien search for {city.name}, what it charges and how long it
            says it takes are not stated here until they have been read from the city&rsquo;s own
            site. They are listed above as withheld. The search is ordered the day the file opens
            whichever office answers it.
          </p>
        )}

        {other.length > 0 ? (
          <>
            <h2>Other {city.name} rules a closing touches</h2>
            {other.map((item) => (
              <div key={item.label}>
                <p>
                  <strong>{item.label}.</strong>
                </p>
                <CityWords quote={item.quote} />
              </div>
            ))}
          </>
        ) : null}

        {record?.notes ? <p className="muted">{record.notes}</p> : null}

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
          {formatMoney(SIMULTANEOUS_LOAN_PREMIUM)}.
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
        ) : (
          <p>
            Local custom for {county.name} has not been confirmed against a source we are willing to
            publish, so this page does not state it. The purchase contract decides who pays in any
            event. Ask us on a specific file and we will tell you what we are seeing.
          </p>
        )}

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
          , not with the city. A release of a city lien is recorded there too. Recording is charged
          by the page at a rate the statute sets for every clerk in Florida:
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
          Chapter 162 and the other statutes quoted above were read from Online Sunshine on{' '}
          {formatLongDate(CODE_CHECKED_ON)}; each quotation links to its section. Statements
          attributed to the {government} are its own published words, each linked to the page it was
          read from with the date. Premium read from {PREMIUM_RULE.cite} on{' '}
          {formatLongDate(PREMIUM_CHECKED_ON)}. Taxes and recording charges read from the statutes
          on {formatLongDate(CHECKED_ON)} and linked line by line above. Cities change their pages
          without notice; tell us if something here does not match what the city tells you and we
          will read it again.
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
        ) : (
          <section>
            <h2>The county page</h2>
            <ul className="linklist">
              <li>
                <Link href={`/counties/${county.slug}`}>The {county.name} page</Link>
              </li>
            </ul>
          </section>
        )}

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
