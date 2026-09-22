import type { Metadata } from 'next';
import Link from 'next/link';

import { getReviewsByTags } from '@/lib/reviews';
import { officeHoursLine, site } from '@/lib/site';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { AnswerPanel } from '@/components/Prose';
import { QuietCta } from '@/components/QuietCta';
import { ReviewList } from '@/components/Reviews';

export const metadata: Metadata = {
  title: 'For realtors and mortgage brokers',
  description:
    'How Bayit Title works with real estate agents and loan officers: one named processor and ' +
    'closer per file, title read in the first week, lender conditions answered directly, and ' +
    'signings arranged around the client. The reviews on this page were left by agents and ' +
    'lenders, not by us.',
  alternates: { canonical: '/partners' },
};

/**
 * The tag on the Google reviews written by people who work in the business:
 * agents, lenders and signing agents. The page says that is who wrote the reviews
 * it shows, so it pulls only this tag: the broader ones (`agent`, `lender`,
 * `referral`) are also on reviews by buyers and sellers who mention their agent
 * or their loan. The reviews are not chosen by hand, and nothing is written for
 * this page or edited into it.
 */
const PARTNER_REVIEW_TAGS = ['industry-professional'];

export default async function PartnersPage() {
  const reviews = await getReviewsByTags(PARTNER_REVIEW_TAGS, 6);

  return (
    <div className="frame section">
      <div className="measure">
        <Breadcrumbs
          trail={[
            { name: 'Home', path: '/' },
            { name: 'For realtors and mortgage brokers', path: '/partners' },
          ]}
        />
        <h1 style={{ marginTop: '1.5rem' }}>For realtors and mortgage brokers</h1>

        <AnswerPanel
          text={
            'Your client’s closing is your reputation as much as ours, so the work here is held to ' +
            'one standard: excellence, in the parts that decide whether your date holds. A named ' +
            'processor and a named closer on every file from opening to recording. The title read ' +
            'in the first week rather than the last. Problems put in writing with what it takes to ' +
            'clear them. Lender conditions answered by someone who can resolve them. And a phone ' +
            'answered by a person who already knows which file you mean.'
          }
        />

        <h2>What the file gets</h2>
        <p>
          A referral is a risk you are taking with your own name, so here is what we think you are
          owed for it: the search read early, a lien found in week one rather than on the day of
          closing, the lender&rsquo;s conditions answered by a person who can resolve them, and
          your client called back. That is the whole of our pitch, and everything below is a
          specific about how it is done.
        </p>
        {reviews.length > 0 ? (
          <p>
            You do not have to take it from us. The <Link href="/reviews">reviews</Link> on this page
            are not ours; they were left on Google by people who work in the business, and they are
            reproduced in full, unedited.
          </p>
        ) : null}

        <h2>For real estate agents</h2>
        <ul>
          <li>
            <strong>The file is opened the day it arrives</strong> and the search is ordered the
            same day. You get the commitment with the exceptions explained in plain words — not a
            PDF and a shrug.
          </li>
          <li>
            <strong>A problem reaches you in writing the week we find it</strong>, with what it
            would take to clear and how long that usually runs. Open permits, association estoppels,
            a probate that never closed, a judgment against a seller: none of these get better by
            being mentioned at the table.
          </li>
          <li>
            <strong>Your client is not handed around.</strong> The same processor and the same
            closer run the file from opening to recording, and both have names you can put in an
            email.
          </li>
          <li>
            <strong>Signings bend to the deal.</strong> In our {site.address.city} office, wherever
            the signer happens to be, or by remote online notarization for an out-of-state or
            overseas party.
          </li>
          <li>
            <strong>You are copied on the things that move your date</strong> — clear to close,
            payoff figures, estoppel returns, recording — rather than having to ask.
          </li>
        </ul>

        <h2>For mortgage brokers and loan officers</h2>
        <ul>
          <li>
            <strong>Conditions get answered, not forwarded.</strong> Title conditions, wiring
            instructions, the closing protection letter and the fee sheet come back from someone who
            can actually resolve them.
          </li>
          <li>
            <strong>Your numbers and ours reconcile before the borrower sees them.</strong> The
            promulgated premium, the simultaneous-issue rate on the loan policy, doc stamps and
            intangible tax, recording by the page — all of it is published on this site with the
            rule or statute behind each figure, so your Loan Estimate can be built from a source
            rather than from a phone call.
          </li>
          <li>
            <strong>The endorsement set is quoted line by line</strong> rather than bundled, so you
            can see exactly what your investor is asking for and what it costs.
          </li>
          <li>
            <strong>Refinances are treated as their own thing.</strong> A refinance has no
            owner&rsquo;s policy alongside, and whether the reissue rate applies is worth checking
            on every one — it frequently does and it is real money to your borrower.
          </li>
          <li>
            <strong>Wire discipline.</strong> We never send wire instructions by email and never
            email a change to instructions already given. Tell your borrowers that, on every
            file.
          </li>
        </ul>

        <h2>Working the harder files</h2>
        <p>
          Commercial transactions — entity authority, leasehold and ALTA policies, UCC and judgment
          searches, staged disbursement — are handled here rather than referred out. So are 1031
          exchanges, which we can facilitate through {site.exchangeCompany.name} —{' '}
          {site.exchangeCompany.relationship}, not ours, though the name suggests otherwise —
          provided the exchange is set up before the relinquished property closes. If you have an
          investor client selling into a like-kind exchange, the earliest phone call is the
          valuable one.{' '}
          <Link href="/services">What we do, in full →</Link>
        </p>

        <h2>Tools you can hand a client</h2>
        <p>
          Both work without a form, a name or an email address, so you can send the link and it will
          not turn into a lead-capture ambush on someone you referred:{' '}
          <Link href="/estimate">estimate title insurance from a property address</Link>, and the{' '}
          <Link href="/estimate?mode=numbers">premium and closing cost calculator</Link> for when
          there is a contract price. The{' '}
          <Link href="/title-problems">title problems library</Link> is written for the same
          purpose — send a page instead of explaining an open permit for the ninth time this year.
        </p>

        {reviews.length > 0 ? (
          <section>
            <h2>What agents and lenders have written</h2>
            <p className="form-note">
              Pulled automatically from our Google reviews by topic — these are the ones left by
              people working in the business. Reproduced in full, in their own words, with nothing
              edited out. <Link href="/reviews">All reviews →</Link>
            </p>
            <ReviewList reviews={reviews} />
          </section>
        ) : null}

        <h2>Starting a file</h2>
        <p>
          <Link href="/order">Open a title order</Link> with the contract and we will confirm receipt
          and the file number the same business day. If you would rather talk it through first, call{' '}
          <a href={`tel:${site.phone}`}>{site.phoneDisplay}</a>.
        </p>
        <p className="muted ui" style={{ fontSize: '0.875rem' }}>
          Office hours are {officeHoursLine}. Signings outside those hours are arranged in advance,
          file by file.
        </p>

        <QuietCta
          text={`Send the contract and ${site.name} will open the file and order the search the same day.`}
        />
      </div>
    </div>
  );
}
