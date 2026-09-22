import type { Metadata } from 'next';
import Link from 'next/link';

import { site } from '@/lib/site';
import { PRIVACY_EFFECTIVE_DATE } from '@/lib/privacy';
import { QUOTE_RETENTION_DAYS, RETENTION_DAYS } from '@/lib/documents';
import { DOWNLOAD_LINK_HOURS } from '@/lib/document-storage';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { baseOpenGraph, formatLongDate, metaDescription } from '@/lib/seo';

/**
 * The website's privacy policy.
 *
 * Two policies ran on the Wix site — /privacy (effective 17 April 2026) and
 * /privacy-policy (last updated 15 March 2026) — saying overlapping things in
 * different words. Every substantive commitment in both is carried over here
 * and the duplicate path now redirects, so there is one policy rather than two
 * that can drift apart.
 *
 * The SMS section is carried over close to the original on purpose. Text of
 * that shape is what carriers require to be publicly posted for an A2P
 * messaging registration, and the old page was cited as both the privacy policy
 * and the SMS terms of service. Removing or loosening it could break message
 * delivery, so it is not the place to be creative.
 *
 * Everything describing the website itself is written from the code and is
 * checkable: the fields each form posts, the salted fingerprint that replaces
 * the caller's IP, the absence of any cookie or browser storage. The only
 * retention periods stated are the two the code enforces — the daily purge in
 * app/api/cron/purge deletes uploaded contracts and order documents at the ages
 * named below — because the firm has never set one for anything else, and
 * inventing a number would be worse than describing the practice honestly.
 *
 * The Cloudflare paragraphs render only when the Turnstile site key is set,
 * which is also the only time the site loads Cloudflare's script. The claim
 * that no third-party script loads stays true in both builds.
 */
export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: metaDescription(`How ${site.legalName} collects, uses and protects information submitted through this website.`),
  alternates: { canonical: '/privacy' },
  openGraph: { ...baseOpenGraph, url: '/privacy' },
};

/** Read at build time, like the CSP: the page and the policy header agree. */
const botCheck = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim());

export default function PrivacyPage() {
  return (
    <div className="frame section">
      <div className="measure">
        <Breadcrumbs
          trail={[
            { name: 'Home', path: '/' },
            { name: 'Privacy Policy', path: '/privacy' },
          ]}
        />
        <h1 className="after-crumbs">Privacy Policy</h1>

        <p className="eyebrow eyebrow--after-title">
          Effective {formatLongDate(PRIVACY_EFFECTIVE_DATE)}
        </p>

        <p className="lede">
          {site.legalName} respects your privacy and protects the information you give us. This
          policy explains what this website collects, what we do with it, who else sees it, and how
          to reach us about it.
        </p>

        <h2>What this policy covers</h2>
        <p>
          This website, at {site.url.replace('https://', '')}, and the information you send through
          its forms. Information you give us later, inside a transaction, is used to do the work you
          asked for and is handled with the same care described here.
        </p>

        <h2>1. Information we collect</h2>
        <p>Through the forms on this site we collect only what you type:</p>
        <ul>
          <li>Your name, email address and, if you give it, a telephone or mobile number</li>
          <li>Your role in the transaction, and how you heard about us</li>
          <li>
            Property and transaction information — the property address, county, parcel or folio
            number, transaction type, purchase price, loan amount, target closing date, the lender
            and a lender contact, buyer and seller names, and the signing method you prefer
          </li>
          <li>Anything you write in a message or notes field</li>
          <li>Which page of this site you sent the form from</li>
        </ul>
        <p>
          On the order form, only your name, your email address and the property address are
          required. The quote and contact forms need only your name and email address, and a
          contract sent from the estimate page needs your name, your email address and the
          contract. Every other field is optional and is marked as optional on the form.
        </p>
        <p>
          If you attach documents to an order, we receive those documents and whatever they contain
          — a contract, a survey, a payoff letter or an estoppel may itself carry financial or
          identification information. We record the file name, its type and size, and when it
          arrived.
        </p>
        <p>
          If you send a contract from the estimate page for exact pricing, we receive the pages you
          upload and whatever they contain, along with your name, your email address, your role in
          the transaction and, if you give them, a phone number and a note.
        </p>

        <h2>2. How we use it</h2>
        <p>Information is used only for legitimate business purposes:</p>
        <ul>
          <li>Opening and working your title, escrow and settlement file</li>
          <li>Processing and closing real estate transactions</li>
          <li>
            Communicating with you about your file — status, closing dates, documents we still need,
            reminders and service updates
          </li>
          <li>Responding to inquiries and customer support requests</li>
          <li>Meeting legal, regulatory and underwriting requirements</li>
        </ul>

        <h2>3. How we share it</h2>
        <p>
          <strong>We do not sell your personal information to anyone.</strong> We share it only as
          far as is necessary to do the work or to comply with the law, with:
        </p>
        <ul>
          <li>Title insurance underwriters, to issue a policy</li>
          <li>
            Parties directly involved in your transaction — lenders, real estate agents and
            attorneys
          </li>
          <li>Government recording offices and municipalities, as the law requires</li>
          <li>
            Service providers who help us operate, under confidentiality obligations. For this
            website those are our hosting provider, our database and document storage provider, and
            the service that emails a notification to our office when you submit a form. All store
            information in the United States.
            {botCheck
              ? ' The forms also use Cloudflare to check that a person, not a program, is sending them.'
              : null}
          </li>
          <li>Government or regulatory authorities, when legally required</li>
        </ul>
        <p>
          Your consent to receive text messages is never shared with third parties or affiliates.
          Mobile information will not be sold, rented, or shared for marketing or promotional
          purposes.
        </p>

        <h2>4. Text messaging (SMS) — terms and conditions</h2>
        <p>
          By providing your telephone number and consenting to receive text messages from{' '}
          {site.legalName}, you agree to receive SMS messages from us. These are transactional and
          customer care messages related to your title insurance and escrow closing order, such as:
        </p>
        <ul>
          <li>File opened and order status updates</li>
          <li>Closing date and appointment reminders</li>
          <li>Document requests and missing information alerts</li>
          <li>Closing confirmation and funds notifications</li>
          <li>General customer care and follow-up</li>
        </ul>
        <p>
          Message frequency varies. Message and data rates may apply. To opt out at any time, reply
          STOP to any message. For assistance, reply HELP or visit{' '}
          {site.url.replace('https://', '')}. This page is both our privacy policy and our SMS terms
          of service.
        </p>
        <p>
          By opting in to SMS from a web form or any other medium, you are agreeing to receive SMS
          messages from {site.legalName}. Message frequency varies. Message and data rates may
          apply. Reply HELP for help. Reply STOP to any message to opt out.
        </p>

        <h2>5. Cookies, analytics and tracking</h2>
        <ul>
          <li>
            <strong>This site sets no cookies</strong> and stores nothing in your browser.
          </li>
          <li>
            <strong>We keep a fingerprint of your IP address, not the address itself.</strong> Like
            any website, our hosting provider sees the address each request comes from and records
            it in its own request logs. When you submit a form, we convert the address using a
            secret key into a short fingerprint that cannot be turned back into an address, and the
            fingerprint is all we store. Its only purpose is to limit how many submissions come from
            one source in an hour, so the forms cannot be flooded.
          </li>
          <li>
            <strong>The address box on the estimator is not stored.</strong> While you type an
            address there, this site asks public records about it and shows you what they say:
            county property appraisers&rsquo; published tax rolls and address points, the city of
            Jacksonville&rsquo;s address locator, the Florida Department of Revenue&rsquo;s
            statewide parcel roll and the U.S. Census Bureau&rsquo;s address geocoder. To find
            addresses in counties that publish none of their own, we also send what you type to
            Esri&rsquo;s geocoding service, which tells us where a building is and nothing else;
            we ask for the result on the basis that it is not stored, and we do not store it. The
            address is not written to our database, not emailed to the office and not kept after
            the answer comes back, and it is sent as a POST so it does not appear in a server log
            the way a search in a web address would.
          </li>
          {botCheck ? (
            <li>
              <strong>We run no advertising or social media trackers.</strong> The one outside
              script this site loads is Cloudflare&rsquo;s check on the forms, which tells a person
              from a program. It runs in its own frame, and Cloudflare handles what it sees of your
              visit under its own privacy policy. Your browser enforces that nothing else loads,
              rather than taking our word for it.
            </li>
          ) : (
            <li>
              <strong>We run no advertising or social media trackers.</strong> This site loads no
              third-party scripts at all, which your browser enforces rather than taking our word
              for it.
            </li>
          )}
          <li>
            We measure page views and page speed using tools served from our own domain. They set no
            cookie and build no profile of you. They tell us which pages are read and how quickly
            they load.
          </li>
        </ul>
        <p>
          The reviews shown on this site were collected by Google on its own platform, not by us. We
          display what reviewers chose to publish there.
        </p>

        <h2>6. How we protect it</h2>
        <p>
          We maintain reasonable administrative, technical and physical safeguards designed to
          protect personal information from unauthorized access, disclosure or misuse. Documents you
          attach to an order, and a contract you send from the estimate page, do not pass through
          this website: your browser sends them directly to private storage using a single-use
          link, and our office opens them through links that expire after {DOWNLOAD_LINK_HOURS}{' '}
          hours.
        </p>
        <p>
          <strong>A word about wire fraud.</strong> Do not send bank account or wire details through
          this website or by email. We will never send you wire instructions by email, and we will
          not change instructions once they have been given. Call {site.phoneDisplay} and speak to
          someone you know to verify anything that claims to come from us.
        </p>

        <h2>7. How long we keep it</h2>
        <p>
          Two kinds of upload have a fixed limit, and a deletion runs every day to keep it. A
          contract sent for pricing from the estimate page is kept in this website&rsquo;s storage
          for no longer than {QUOTE_RETENTION_DAYS} days, and documents attached to an order for no
          longer than {RETENTION_DAYS} days. After that they are deleted.
        </p>
        <p>
          Otherwise, we keep information for as long as it is needed for the purposes described above and for
          as long as the law and our underwriting obligations require us to keep it. When it is no
          longer needed for either, we dispose of it. You can ask us to delete information we hold
          about you, and we will do so unless we are required to keep it.
        </p>

        <h2>8. Your rights</h2>
        <p>
          You may contact us at any time to ask what personal information we hold about you, to ask
          for it to be corrected, or to ask for it to be deleted, subject to applicable legal
          requirements. Write to <a href={`mailto:${site.email}`}>{site.email}</a> or call{' '}
          {site.phoneDisplay} and we will tell you what we hold and what we can do about it.
        </p>

        <h2>9. Children</h2>
        <p>
          This website is meant for people conducting real estate transactions. It is not directed
          to children, and we do not knowingly collect information from anyone under 13. If you
          believe a child has sent us information, contact us and we will delete it.
        </p>

        <h2>10. Changes to this policy</h2>
        <p>
          We may update this policy from time to time. Any update is posted on this page with a
          revised effective date. This policy is linked in the footer of every page on this site and
          next to every form that asks for your information.
        </p>

        <h2>11. Contact us</h2>
        <p>
          {site.legalName}
          <br />
          {site.address.street}
          <br />
          {site.address.city}, {site.address.region} {site.address.postalCode}
          <br />
          Telephone <a href={`tel:${site.phone}`}>{site.phoneDisplay}</a>
          <br />
          Email <a href={`mailto:${site.email}`}>{site.email}</a>
        </p>
        <p className="form-note">
          This page describes how we handle information. It is not legal advice, and it does not
          change the terms of any contract or closing document. If you have a question about your
          own file, <Link href="/contact">get in touch</Link> and ask us directly.
        </p>
      </div>
    </div>
  );
}
