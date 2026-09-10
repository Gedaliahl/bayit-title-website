import type { Metadata } from 'next';
import Link from 'next/link';

import { site } from '@/lib/site';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { QuietCta } from '@/components/QuietCta';

export const metadata: Metadata = {
  title: 'About',
  description: `${site.legalName} is a Florida title insurance agency founded in ${site.founded} in ${site.address.city}, closing throughout Florida.`,
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
          Bayit means home in Hebrew. {site.legalName} was founded in {site.founded} in{' '}
          {site.address.city}, Florida, and closes residential and commercial transactions
          throughout Florida.
        </p>

        {/*
          The founding story and the longer About narrative live in
          bayit-title-voice-guide-and-bios.md and are Shevy's to tell. Nothing
          is written here on her behalf. Drop that copy in when it arrives.
        */}

        <h2>What we are, precisely</h2>
        <p>
          We are a licensed Florida title insurance agency, not a law firm and not an underwriter.
          We search title, examine what the search returns, issue title commitments and policies as
          an agent for {site.underwriter}, hold escrow, and conduct closings. Where a matter is
          contested — a probate that needs administration, a quiet title action, a boundary dispute,
          anything headed to a courtroom — the right person is a Florida real estate attorney, and
          we will say so rather than work around it.
        </p>

        <h2>Licensing</h2>
        <ul>
          <li>
            {site.legalName} holds Florida Title Insurance Agency License{' '}
            <strong>{site.agencyLicense}</strong> (NPN {site.agencyNpn}), issued November 22, 2021.
          </li>
          <li>
            The Agent in Charge is {site.agentInCharge.legalName}, Florida Title Agent License{' '}
            <strong>{site.agentInCharge.license}</strong> (NPN {site.agentInCharge.npn}), issued
            October 22, 2021. She has worked in title since {site.agentInCharge.inTitleSince} and
            has been Florida-licensed since {site.agentInCharge.licensedSince}.
          </li>
          <li>
            Policies are underwritten by {site.underwriter}. Our agency appointment has been on the
            Florida Department of Financial Services public record since December 9, 2021.
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
          Office hours are {site.hours[0].days} {site.hours[0].open} to {site.hours[0].close}, and{' '}
          {site.hours[1].days} {site.hours[1].open} to {site.hours[1].close}. Signings outside those
          hours are arranged in advance, file by file.
        </p>

        <h2>Why we write these pages</h2>
        <p>
          Most of what is written about Florida title online is either an advertisement or a
          national article that does not survive contact with a Florida county. The pages in our{' '}
          <Link href="/title-problems">title problems library</Link> take one situation at a time,
          say what it is and what clearing it takes, and carry the name and licence number of the
          agent who reviewed them. Where a fact is not yet confirmed, the page says so on its face
          instead of guessing.
        </p>

        <QuietCta />
      </div>
    </div>
  );
}
