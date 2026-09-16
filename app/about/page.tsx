import type { Metadata } from 'next';
import Link from 'next/link';

import { officeHoursLine, site } from '@/lib/site';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { QuietCta } from '@/components/QuietCta';

export const metadata: Metadata = {
  title: 'About',
  description:
    `${site.legalName} is a Florida title insurance agency in ${site.address.city}, closing ` +
    `residential and commercial transactions throughout Florida. What we are, exactly, what we ` +
    `are not, and the specific things that make the work excellent.`,
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <div className="frame section">
      <div className="measure">
        <Breadcrumbs
          trail={[
            { name: 'Home', path: '/' },
            { name: 'About', path: '/about' },
          ]}
        />
        <h1 style={{ marginTop: '1.5rem' }}>About Bayit Title</h1>

        <p className="lede">
          Bayit means home in Hebrew. {site.legalName} is a Florida title insurance agency in{' '}
          {site.address.city}, closing residential and commercial transactions throughout Florida.
        </p>

        {/*
          The founding story and the longer About narrative live in
          bayit-title-voice-guide-and-bios.md and are Shevy's to tell. Nothing
          is written here on her behalf. Drop that copy in when it arrives.
        */}

        <h2>What we are</h2>
        <p>
          We are a licensed Florida title insurance agency. That means four things, and it is worth
          being exact about them, because &ldquo;title company&rdquo; is used loosely and the
          differences decide who is responsible when something goes wrong on your file.
        </p>
        <ul>
          <li>
            <strong>We search and examine title.</strong> Somebody here reads the public record
            back through the chain — deeds, mortgages, liens, judgments, probates, plats, permits —
            and works out what actually encumbers the property and what it would take to clear.
          </li>
          <li>
            <strong>We issue title insurance.</strong> We write commitments and policies as an
            agent for {site.underwriter}. The underwriter carries the risk; we are the licensed
            agency that examines the title and issues the policy on its paper.
          </li>
          <li>
            <strong>We hold the escrow.</strong> Deposits, payoffs and proceeds sit in our trust
            account, reconciled, and go out on written instructions we have confirmed by voice. We
            will never email you a change to wire instructions.
          </li>
          <li>
            <strong>We close the transaction.</strong> We prepare the settlement statement, run the
            signing in our office, wherever the signer is, or by remote online notarization, record
            the documents, disburse, and issue the policy.
          </li>
        </ul>
        <p>
          And we are excellent at it. That word is doing specific work here, so here is what it
          means in practice: the search is read rather than skimmed, by a person who will tell you
          what each exception actually does to your file. A problem is raised in week one, in
          writing, with what clearing it takes — not in week six. The same processor and the same
          closer hold the file from opening through recording. The phone is answered by someone who
          knows which file you mean. Read our{' '}
          <Link href="/reviews">clients&rsquo; and their agents&rsquo; own accounts</Link> and that
          is what they describe.
        </p>
        <p>
          What we are not: a law firm and not an underwriter. Where a matter is contested — a
          probate that needs administration, a quiet title action, a boundary dispute, anything
          headed for a courtroom — the right person is a Florida real estate attorney, and we will
          say so rather than work around it.
        </p>

        <h2>What we handle</h2>
        <p>
          <strong>Residential.</strong> Purchases, sales, refinances, new construction, condominium
          and HOA files, cash closings, out-of-state and foreign sellers.
        </p>
        <p>
          <strong>Commercial.</strong> Office, retail, industrial, multifamily and land. Entity
          searches and authority documents, leasehold and ALTA policies, lender endorsements, UCC
          and judgment searches against the entities on both sides, and escrow held to the terms
          the parties negotiated rather than to a residential template.
        </p>
        <p>
          <strong>1031 exchanges.</strong> A like-kind exchange needs a qualified intermediary, and
          the exchange has to be in place before the relinquished property closes. We can facilitate
          one through {site.exchangeCompany.name}, which is {site.exchangeCompany.relationship}, so
          the intermediary and the closing are coordinated in one place. You are free to use any
          intermediary you like; tell us early either way, because after the seller has constructive
          receipt of the money there is no exchange left to structure. We are not tax advisers — the
          decision to exchange belongs with your CPA or tax counsel.{' '}
          <Link href="/services">What we do, in full →</Link>
        </p>

        <h2>Licensing</h2>
        <ul>
          <li>
            {site.legalName} holds Florida Title Insurance Agency License{' '}
            <strong>{site.agencyLicense}</strong> (NPN {site.agencyNpn}).
          </li>
          <li>
            The Agent in Charge is {site.agentInCharge.legalName}, Florida Title Agent License{' '}
            <strong>{site.agentInCharge.license}</strong> (NPN {site.agentInCharge.npn}). She has
            worked in title since {site.agentInCharge.inTitleSince}.
          </li>
          <li>
            Policies are underwritten by {site.underwriter}, and our agency appointment is on the
            Florida Department of Financial Services public record.
          </li>
        </ul>
        <p className="form-note">
          Every number above can be checked against the Florida Department of Financial Services
          licensee search. We publish them because a reader should not have to take our word for it.
        </p>

        <h2>Who does the work</h2>
        <p>
          Four people, all in the {site.address.city} office: {site.team.map((m) => m.name).join(', ')}
          . The same processor and the same closer carry a file from opening through recording.{' '}
          <Link href="/team">More about the team →</Link>
        </p>

        <h2>Where and how we close</h2>
        <p>
          We close throughout Florida. Most files are in{' '}
          {site.priorityCounties.slice(0, -1).join(', ')} and {site.priorityCounties.at(-1)}.
          Signings happen in our office, wherever the signer happens to be, or by remote online
          notarization — whichever suits the file.
        </p>
        <p className="muted ui" style={{ fontSize: '0.875rem' }}>
          Office hours are {officeHoursLine}. Signings outside those hours are arranged in advance,
          file by file.
        </p>

        <h2>Why we write these pages</h2>
        <p>
          Most of what is written about Florida title online is either an advertisement or a
          national article that does not survive contact with a Florida county. The pages in our{' '}
          <Link href="/title-problems">title problems library</Link> take one situation at a time,
          say what it is and what clearing it takes, and carry the name and license number of the
          agent who reviewed them. Where a fact is not yet confirmed, the page says so on its face
          instead of guessing.
        </p>

        <QuietCta />
      </div>
    </div>
  );
}
