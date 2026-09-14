import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getCounties, getLocation } from '@/lib/locations';
import { getAllDocs } from '@/lib/content';
import { getCountyRates, estimateClosingTaxes, formatMoney, formatRate } from '@/lib/rates';
import { getReviews } from '@/lib/reviews';
import { site } from '@/lib/site';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { AnswerPanel, VerifyBanner } from '@/components/Prose';
import { QuietCta } from '@/components/QuietCta';
import { RateTable } from '@/components/RateTable';
import { ReviewList } from '@/components/Reviews';

export const dynamicParams = false;

/** The worked example below. Round numbers, so the arithmetic stays checkable. */
const EXAMPLE_PRICE = 500_000;
const EXAMPLE_LOAN = 400_000;
/** Page count for the recording example: a deed that runs to two pages. */
const EXAMPLE_DEED_PAGES = 2;

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
      `policy, what the recording office charges, the documentary stamp and intangible tax ` +
      `collected at recording, and what ${site.name} does on a ${county.name} file.`,
    alternates: { canonical: `/counties/${county.slug}` },
  };
}

export default async function CountyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const county = await getLocation(slug);
  if (!county) notFound();

  const [docs, reviews, rates] = await Promise.all([
    getAllDocs('title-problems'),
    getReviews(),
    getCountyRates(county.slug),
  ]);
  const localDocs = docs.filter((doc) => doc.counties.includes(county.slug));
  const localReviews = reviews.filter((review) => review.countySlug === county.slug).slice(0, 3);

  const payer = county.customaryOwnerPolicyPayer;
  const recordingOffice = county.clerkName ?? `${county.name} Clerk of Court`;

  const firstPage = rates.get('recording_first_page');
  const additionalPage = rates.get('recording_additional_page');
  const extraName = rates.get('recording_extra_name');
  const deedStamps = rates.get('tax_doc_stamps_deed');
  const surtax = rates.get('tax_doc_stamps_surtax');

  // The recording figures are a statewide statutory ceiling, so the example is
  // arithmetic on the stored rates rather than a claim about this county.
  const exampleDeedRecording =
    firstPage && additionalPage
      ? firstPage.value + (EXAMPLE_DEED_PAGES - 1) * additionalPage.value
      : null;

  const exampleTaxes = estimateClosingTaxes(rates, {
    purchasePrice: EXAMPLE_PRICE,
    loanAmount: EXAMPLE_LOAN,
  });
  // Only rendered where the county actually levies a surtax.
  const exampleWithSurtax = surtax
    ? estimateClosingTaxes(rates, {
        purchasePrice: EXAMPLE_PRICE,
        loanAmount: EXAMPLE_LOAN,
        isSingleFamilyResidence: false,
      })
    : null;

  // What is still genuinely unconfirmed. The recording charges and the taxes
  // came off the statute and the offices' own schedules; turnaround and our own
  // pass-through charges did not, and no amount of research settles them.
  const openItems = [
    `Typical recording turnaround at the ${recordingOffice}`,
    'Whether we pass an e-recording charge through on a file, and how it appears on the closing statement',
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
            (firstPage && additionalPage && deedStamps
              ? `Recording a deed costs ${formatRate(firstPage)} for the first page and ` +
                `${formatRate(additionalPage)} for each page after it, and the deed carries ` +
                `documentary stamp tax of ${formatRate(deedStamps)} of the price` +
                (surtax ? `, plus a ${formatRate(surtax)} county surtax on anything other than a single-family residence` : '') +
                '. '
              : '') +
            'Title insurance premiums in Florida are promulgated, so the premium is the same at any ' +
            'agency; what differs is local custom, recording practice and who is working the file.'
          }
        />

        <VerifyBanner flags={openItems} />

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
          other line items, not the premium. The figures below are those other line items: what the
          recording office charges, and what tax it collects on the way through.
        </p>

        {rates.recording.length > 0 ? (
          <section>
            <h2>What does it cost to record a document in {county.name}?</h2>
            <p>
              The same as anywhere else in Florida. Fla. Stat. § 28.24 sets what a recording office
              may charge and says those charges &ldquo;may not exceed those specified in this
              section,&rdquo; so the recording charge is a statewide ceiling rather than a county
              price, and it applies whether a document is walked to the counter or e-recorded. These
              are the figures in force.
            </p>
            <RateTable rates={rates.recording} />
            {exampleDeedRecording !== null && firstPage && additionalPage ? (
              <p>
                So a {EXAMPLE_DEED_PAGES}-page deed costs {formatRate(firstPage)} for the first
                page and {formatRate(additionalPage)} for the second —{' '}
                {formatMoney(exampleDeedRecording)} to record. Page count is what moves this number,
                which is why a long legal description or a set of riders shows up on the closing
                statement.
                {extraName
                  ? ` Add ${formatRate(extraName)} a name once an instrument carries more than four of them.`
                  : ''}
              </p>
            ) : null}
          </section>
        ) : null}

        {rates.taxes.length > 0 ? (
          <section>
            <h2>What tax is collected when the deed and mortgage are recorded?</h2>
            <p>
              Documentary stamp tax on the deed, documentary stamp tax on the note and mortgage, and
              the nonrecurring intangible tax on the mortgage. The recording office collects all
              three at recording, and none of them is ours — we hand them over.
              {surtax
                ? ` ${county.name} is the one county in Florida that levies a discretionary surtax on top, and its deed rate is lower to match.`
                : ''}
            </p>
            <RateTable
              rates={rates.taxes}
              localKeys={rates.localKeys}
              localLabel={`${county.name} rate`}
            />
            <p>
              Each rate is charged on every $100 <em>or fraction of $100</em>, so a price of
              $499,950 is taxed as though it were $500,000. Consideration is not only the cash: a
              mortgage balance the buyer takes subject to or assumes counts toward the deed tax.
            </p>

            {exampleTaxes ? (
              <div className="rate-example">
                <h3>
                  {formatMoney(EXAMPLE_PRICE)} purchase, {formatMoney(EXAMPLE_LOAN)} mortgage, in{' '}
                  {county.name}
                </h3>
                <dl>
                  <dt>Documentary stamps on the deed</dt>
                  <dd>{formatMoney(exampleTaxes.deedDocStamps)}</dd>
                  {exampleTaxes.mortgageDocStamps !== null ? (
                    <>
                      <dt>Documentary stamps on the note and mortgage</dt>
                      <dd>{formatMoney(exampleTaxes.mortgageDocStamps)}</dd>
                    </>
                  ) : null}
                  {exampleTaxes.intangibleTax !== null ? (
                    <>
                      <dt>Nonrecurring intangible tax on the mortgage</dt>
                      <dd>{formatMoney(exampleTaxes.intangibleTax)}</dd>
                    </>
                  ) : null}
                  <div className="rate-example__total" style={{ display: 'contents' }}>
                    <dt>Tax collected at recording</dt>
                    <dd>{formatMoney(exampleTaxes.total)}</dd>
                  </div>
                </dl>
                <p className="form-note" style={{ marginTop: '0.75rem' }}>
                  Arithmetic on the rates above, for a single-family residence. It is not a quote:
                  it leaves out the promulgated premium, the search, the recording charge itself and
                  anything the file turns up.
                  {exampleWithSurtax && exampleWithSurtax.surtax !== null
                    ? ` On a transfer of anything other than a single-family residence at the same price, the surtax adds ${formatMoney(exampleWithSurtax.surtax)}.`
                    : ''}
                </p>
              </div>
            ) : null}
          </section>
        ) : null}

        <h2>Where a {county.name} document is recorded</h2>
        <p>
          Deeds and mortgages are recorded with the{' '}
          {county.clerkUrl ? (
            <a href={county.clerkUrl} rel="nofollow noopener" target="_blank">
              {recordingOffice}
            </a>
          ) : (
            recordingOffice
          )}
          .
          {county.eRecordingAvailable
            ? ' We e-record in this county, so a document usually posts without a courier trip. Fla. Stat. § 28.24 charges the same either way — the statute covers services rendered "manually or electronically."'
            : ''}{' '}
          Recording turnaround affects when a policy can issue, so it is worth knowing on a file with
          a tight timeline.
        </p>

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
