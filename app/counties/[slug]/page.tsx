import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getCounties, getLocation } from '@/lib/locations';
import { getAllDocs } from '@/lib/content';
import { getReviews } from '@/lib/reviews';
import { formatLongDate } from '@/lib/seo';
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
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { AnswerPanel, VerifyBanner } from '@/components/Prose';
import { StatutoryCharges } from '@/components/StatutoryCharges';
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

  return {
    title: `Title and closing in ${county.name}`,
    description:
      `How a closing works in ${county.name}, Florida: who customarily pays for the owner’s ` +
      `policy, how recording works, and what ${site.name} does on a ${county.name} file.`,
    alternates: { canonical: `/counties/${county.slug}` },
  };
}

export default async function CountyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const county = await getLocation(slug);
  if (!county) notFound();

  const [docs, reviews] = await Promise.all([getAllDocs('title-problems'), getReviews()]);
  const localDocs = docs.filter((doc) => doc.counties.includes(county.slug));
  const localReviews = reviews.filter((review) => review.countySlug === county.slug).slice(0, 3);

  const payer = county.customaryOwnerPolicyPayer;

  // Transfer taxes and recording charges are set by statute, so they are stated
  // below and cited to the section that sets them rather than withheld. What is
  // genuinely not on this page is the promulgated premium schedule, and this
  // clerk's own turnaround where the office publishes none.
  const deedStamps = deedStampTax(county.slug);
  const surtax = discretionarySurtax(county.slug);

  const openItems = [
    'The promulgated premium schedule for an owner’s policy',
    // Cleared only where the recording office publishes a statement of its own.
    // Most Florida counties publish nothing, and for those the flag stands.
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
        <h1 style={{ marginTop: '1.5rem' }}>Title and closing in {county.name}</h1>

        <AnswerPanel
          text={
            `${site.legalName} closes in ${county.name} from our office in ${site.address.city}. ` +
            (payer
              ? `In ${county.name} the owner’s title policy is customarily paid for by the ${payer}, ` +
                'though the contract controls and the parties can agree otherwise. '
              : '') +
            'Title insurance premiums in Florida are promulgated, so the premium is the same at any ' +
            'agency; what differs is local custom, recording practice and who is working the file.'
          }
        />

        <VerifyBanner flags={openItems} variant="withheld" />

        <h2>Who pays for the owner&rsquo;s policy in {county.name}?</h2>
        {payer ? (
          <p>
            Custom in {county.name} is that the <strong>{payer}</strong> pays for the owner&rsquo;s
            policy. Custom is not law. The purchase contract decides it, and in a negotiated deal
            either side can end up paying. Read the contract before assuming which line it falls on.
          </p>
        ) : (
          <p>
            Local custom for this county has not been confirmed against a source we are willing to
            publish. The purchase contract decides who pays in any event. Ask us on a specific file
            and we will tell you what we are seeing.
          </p>
        )}

        <h2>What does the premium cost?</h2>
        <p>
          Florida title insurance rates are promulgated — set by the Florida Office of Insurance
          Regulation and identical across agencies for the same coverage amount. An agency does not
          discount the premium, and a quote that is lower than another quote is a difference in the
          other line items, not the premium. We have not published the premium schedule itself yet;
          ask us for the figure on a specific price and we will give it to you.
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

        <StatutoryCharges charges={surtax ? [deedStamps, surtax] : [deedStamps]} />

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

        <StatutoryCharges charges={MORTGAGE_CHARGES} />

        <p>
          On a {formatMoney(EXAMPLE_LOAN)} loan that is{' '}
          <strong>{formatMoney(mortgageStampTaxDue(EXAMPLE_LOAN))}</strong> in mortgage stamps
          and <strong>{formatMoney(intangibleTaxDue(EXAMPLE_LOAN))}</strong> in intangible tax.
        </p>

        <h2>Recording</h2>
        <p>
          Deeds and mortgages are recorded with the{' '}
          {county.clerkName ?? `${county.name} Clerk of Court`}.
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

        <StatutoryCharges charges={RECORDING_CHARGES} />

        <p>
          A two-page deed is {formatMoney(recordingChargeDue(2))} and a twelve-page mortgage is{' '}
          {formatMoney(recordingChargeDue(12))}. The clerk&rsquo;s own fee schedule covers the
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
              {county.clerkName ?? `${county.name} Clerk of Court`} publishes this:
            </p>
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
              That is the office&rsquo;s own published statement, not a commitment it makes to us or
              a time we can promise you. Offices change these pages without notice. On a file where
              the recording date matters, ask us and we will check what the office is actually doing
              that week.
            </p>
          </>
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
