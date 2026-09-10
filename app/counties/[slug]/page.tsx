import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getCounties, getLocation } from '@/lib/locations';
import { getAllDocs } from '@/lib/content';
import { getReviews } from '@/lib/reviews';
import { site } from '@/lib/site';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { AnswerPanel, VerifyBanner } from '@/components/Prose';
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

  // Fees, doc stamps and surtax are held back until rate_tables carries figures
  // with a source URL. A closing cost figure invented for a web page is the
  // exact failure this project is built to avoid.
  const openItems = [
    'Recording fees and the current clerk fee schedule for this county',
    'Documentary stamp tax and, where it applies, county surtax figures',
    'Typical recording turnaround at this clerk',
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
          other line items, not the premium. We publish figures once each one is tied to its source;
          the open items are listed above.
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
