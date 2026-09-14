import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { site } from '@/lib/site';
import { PRIVACY_PUBLISHED, PRIVACY_STATUS } from '@/lib/privacy';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { DraftBanner } from '@/components/DraftBanner';
import { VerifyBanner } from '@/components/Prose';

/**
 * A privacy policy is a binding representation by a licensed financial
 * institution, so it gets the same gate as every other page that says something
 * a regulator could read: unreviewed, it does not reach the public site.
 *
 * Everything below that describes the website is written from the code and is
 * checkable — the fields each form posts, the fingerprint that replaces the
 * caller's IP, the absence of cookies, the vendors that actually receive data.
 * Everything that is a decision about the firm's practice rather than a fact
 * about the software is flagged rather than guessed, because inventing a
 * retention period or a rights process is exactly the failure this repository
 * is built to prevent.
 *
 * The status itself lives in lib/privacy.ts, because the footer link and the
 * sitemap have to agree with this page about whether the policy exists yet.
 */

/** Only the firm and its counsel can close these. */
const OPEN_ITEMS = [
  'How long form submissions, orders and uploaded documents are kept, and what happens at the end of that period',
  'Whether this page is the agency’s Gramm-Leach-Bliley privacy notice or whether a separate notice is delivered at closing',
  'How someone asks what we hold about them, asks for it to be corrected, or asks for it to be deleted, and who handles that',
  'What is shared with First American as underwriter, and on what basis',
  'The effective date, and how changes to this page will be communicated',
];

export const metadata: Metadata = {
  title: 'Privacy',
  description: `What ${site.legalName} does with information submitted through this website.`,
  alternates: { canonical: '/privacy' },
  ...(PRIVACY_STATUS === 'draft' ? { robots: { index: false, follow: false } } : {}),
};

/** An unresolved point, marked in the copy the way the library pages mark theirs. */
function Verify({ children }: { children: React.ReactNode }) {
  return <span className="verify-inline">VERIFY: {children}</span>;
}

export default function PrivacyPage() {
  if (!PRIVACY_PUBLISHED) notFound();

  return (
    <div className="frame section">
      <div className="measure">
        <Breadcrumbs
          trail={[
            { name: 'Home', path: '/' },
            { name: 'Privacy', path: '/privacy' },
          ]}
        />
        <h1 style={{ marginTop: '1.5rem' }}>Privacy</h1>

        <p className="lede">
          This page describes what happens to information you send through this website. It is
          written from what the site actually does, and the points still open are marked as open
          rather than filled in.
        </p>

        {PRIVACY_STATUS === 'draft' ? <DraftBanner /> : null}
        <VerifyBanner flags={OPEN_ITEMS} />

        <h2>What this page covers</h2>
        <p>
          This website, at {site.url.replace('https://', '')}. A closing file is a separate matter:
          information you give us during a transaction is handled under the agency’s own
          procedures, not under this page.{' '}
          <Verify>
            whether a separate Gramm-Leach-Bliley privacy notice is delivered to consumers at
            closing, and whether this page is meant to be that notice
          </Verify>
        </p>

        <h2>What a form collects</h2>
        <p>
          Only what you type. The quote and contact forms take your name and an email address, and
          optionally a phone number, your role in the transaction, a property address and county,
          the type of transaction, a purchase price and loan amount, how you heard about us, and
          whatever you write in the message.
        </p>
        <p>
          The <Link href="/order">order form</Link> takes the same, plus buyer and seller names, a
          parcel or folio number, the lender and a lender contact, a target closing date, the
          signing method you prefer, and your notes. Each submission also records which page it was
          sent from.
        </p>
        <p>
          Every field except your name, your email and the property address is optional, and the
          form says so next to each one.
        </p>

        <h2>Documents you attach to an order</h2>
        <p>
          Attachments do not pass through this website. Your browser sends them directly to private
          storage using a short-lived link issued for that one file, and the office opens them
          through links that expire. Alongside the file we record what it was called, its type and
          size, and when it arrived.
        </p>
        <p>
          Do not send bank account or wire details through the form or by email. We will never send
          you wire instructions by email, and we will not change instructions once given. Call{' '}
          {site.phoneDisplay} to verify anything that claims to come from us.
        </p>

        <h2>What we do not collect</h2>
        <ul>
          <li>
            <strong>No cookies.</strong> This site sets none, and stores nothing in your browser.
          </li>
          <li>
            <strong>Not your IP address.</strong> It is never stored. When a form is submitted the
            address is converted, using a secret key, into a short fingerprint that cannot be turned
            back into an address. Its only use is to cap how many submissions come from one source
            in an hour, so the forms cannot be flooded.
          </li>
          <li>
            <strong>No advertising or social trackers.</strong> The site loads no third-party
            scripts at all, which is enforced by the browser rather than left to good intentions.
          </li>
        </ul>

        <h2>How we measure the site</h2>
        <p>
          We count page views and page speed using tools served from our own domain. They set no
          cookie and build no profile of you; they tell us which pages get read and how quickly they
          load.
        </p>

        <h2>Who else handles it</h2>
        <p>
          The site runs on Vercel. Submissions, orders and uploaded documents are stored with
          Supabase, in the United States. When you send a form, a notification is emailed to the
          office through Resend. Those three hold information because the site cannot work without
          them.
        </p>
        <p>
          The reviews shown on this site were collected by Google on its own platform, not by us. We
          display what reviewers chose to publish there.{' '}
          <Verify>
            what information is shared with First American Title Insurance Company as underwriter,
            and on what basis
          </Verify>
        </p>

        <h2>How long we keep it</h2>
        <p>
          <Verify>
            no retention schedule has been set for form submissions, orders or uploaded documents.
            This section must say what is kept, for how long, and what happens at the end of that
            period, and it needs to be a decision the firm makes rather than a default inherited
            from software
          </Verify>
        </p>

        <h2>Asking what we hold</h2>
        <p>
          <Verify>
            how someone asks what we hold about them, asks for it to be corrected, or asks for it to
            be deleted; who at the firm handles that; and how long a response takes
          </Verify>
        </p>

        <h2>Reaching us about this</h2>
        <p>
          {site.legalName}, {site.address.street}, {site.address.city}, {site.address.region}{' '}
          {site.address.postalCode}. Telephone{' '}
          <a href={`tel:${site.phone}`}>{site.phoneDisplay}</a>, email{' '}
          <a href={`mailto:${site.email}`}>{site.email}</a>.
        </p>

        <h2>Changes to this page</h2>
        <p>
          <Verify>the effective date, and how a material change to this page gets communicated</Verify>
        </p>
      </div>
    </div>
  );
}
