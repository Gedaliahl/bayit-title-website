// What the agency is, exactly, and what it is not. The card at the top is the
// page's argument in four rows: every number on it is on a public record, and
// the button beside it is how a reader checks them.

import type { Metadata } from 'next';
import Link from 'next/link';

import { officeHoursLine, site } from '@/lib/site';
import { team } from '@/lib/team';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { QuietCta } from '@/components/QuietCta';
import { Verdict } from '@/components/Verdict';
import { StepBand } from '@/components/StepBand';
import { Rail } from '@/components/Rail';
import { initials } from '@/components/Prose';

export const metadata: Metadata = {
  title: 'About',
  description:
    `${site.legalName} is a Florida title insurance agency in ${site.address.city}, closing ` +
    `residential and commercial transactions throughout Florida. What we are, exactly, what we ` +
    `are not, and the specific things that make the work excellent.`,
  alternates: { canonical: '/about' },
};

const WHAT_AN_AGENCY_DOES = [
  {
    label: '01',
    title: 'Search and examine title',
    body:
      'Somebody here reads the public record back through the chain and works out what actually ' +
      'encumbers the property and what it would take to clear.',
  },
  {
    label: '02',
    title: 'Issue title insurance',
    body:
      `Commitments and policies as an agent for ${site.underwriter}. The underwriter carries the ` +
      'risk; we examine and issue on its paper.',
  },
  {
    label: '03',
    title: 'Hold the escrow',
    body:
      'Deposits, payoffs and proceeds in our trust account, reconciled, out on written ' +
      'instructions confirmed by voice.',
  },
  {
    label: '04',
    title: 'Close the transaction',
    body: 'Settlement statement, the signing, recording, disbursement, and the policy.',
  },
];

const WHAT_WE_HANDLE = [
  {
    title: 'Residential',
    body:
      'Purchases, sales, refinances, new construction, condominium and HOA files, cash closings, ' +
      'out-of-state and foreign sellers.',
  },
  {
    title: 'Commercial',
    body:
      'Office, retail, industrial, multifamily and land. Entity searches, ALTA and leasehold ' +
      'policies, lender endorsements, UCC and judgment searches, escrow on negotiated terms.',
  },
  {
    title: '1031 exchanges',
    body:
      `Through ${site.exchangeCompany.name} — ${site.exchangeCompany.relationship}, despite the ` +
      'shared name. We are not tax advisers.',
  },
];

export default function AboutPage() {
  const priority = site.priorityCounties.map((county) => county.replace(/\s+County$/, ''));

  return (
    <div>
      <section className="frame page-hero">
        <div className="page-hero__copy">
          <Breadcrumbs
            trail={[
              { name: 'Home', path: '/' },
              { name: 'About', path: '/about' },
            ]}
          />
          <h1>About {site.name}</h1>
          <p className="page-hero__lede">
            <em>Bayit</em> means home in Hebrew. {site.legalName} is a Florida title insurance
            agency in {site.address.city}, closing residential and commercial transactions
            throughout {site.serviceArea}. Four people, one office, the same processor and closer
            from opening through recording.
          </p>
          <p className="page-hero__meta">
            <span>
              <span className="page-hero__dot" aria-hidden="true" />
              Licensed Florida title insurance agency
            </span>
            <span>In title since {site.agentInCharge.inTitleSince}</span>
          </p>
        </div>

        <Verdict
          eyebrow="Check us against the record"
          headline="Every number here is public."
          rows={[
            {
              term: 'Agency license',
              detail: `${site.agencyLicense} · NPN ${site.agencyNpn}`,
            },
            {
              term: 'Agent in charge',
              detail: `${site.agentInCharge.legalName}, ${site.agentInCharge.license}`,
            },
            { term: 'Underwriter', detail: site.underwriter },
            {
              term: 'Office',
              detail: `${site.address.street}, ${site.address.city}`,
            },
          ]}
          action={{
            prompt: 'Florida DFS licensee search',
            label: 'Verify the license',
            href: site.dfsLicenseeSearchUrl,
          }}
        />
      </section>

      <StepBand
        heading="What a title agency does"
        caption="Four things — the differences decide who is responsible when something goes wrong"
        columns={4}
        steps={WHAT_AN_AGENCY_DOES}
      />

      <div className="frame cols">
        <Rail
          label="The detail"
          items={[
            { id: 'excellent', label: 'What “excellent” means here' },
            { id: 'not', label: 'What we are not' },
            { id: 'handle', label: 'What we handle' },
            { id: 'licensing', label: 'Licensing' },
            { id: 'team', label: 'Who does the work' },
            { id: 'where', label: 'Where and how we close' },
            { id: 'why', label: 'Why we write these pages' },
          ]}
        />

        <div className="detail">
          <section id="excellent">
            <h2>What “excellent” means here</h2>
            <div className="prose prose--detail">
              <p>
                That word is doing specific work, so here is what it means in practice: the search
                is read rather than skimmed, by a person who will tell you what each exception
                actually does to your file. A problem is raised in week one, in writing, with what
                clearing it takes — not in week six. The same processor and the same closer hold the
                file from opening through recording. The phone is answered by someone who knows
                which file you mean. Read our{' '}
                <Link href="/reviews">clients’ and their agents’ own accounts</Link> and that is
                what they describe.
              </p>
            </div>
          </section>

          <section id="not">
            <h2>What we are not</h2>
            <div className="callout">
              <div className="prose prose--detail">
                <p>
                  A law firm, and not an underwriter. Where a matter is contested — a probate that
                  needs administration, a quiet title action, a boundary dispute, anything headed
                  for a courtroom — the right person is a Florida real estate attorney, and we will
                  say so rather than work around it.
                </p>
              </div>
            </div>
          </section>

          <section id="handle">
            <div className="section__head">
              <h2>What we handle</h2>
              <Link href="/services" className="section__head-link">
                What we do, in full →
              </Link>
            </div>
            <ul className="card-grid card-grid--narrow">
              {WHAT_WE_HANDLE.map((item) => (
                <li key={item.title} className="flat-card">
                  <p className="flat-card__title">{item.title}</p>
                  <p className="flat-card__body">{item.body}</p>
                </li>
              ))}
            </ul>
          </section>

          <section id="licensing">
            <h2>Licensing</h2>
            <div className="prose prose--detail">
              <ul>
                <li>
                  {site.legalName} holds Florida Title Insurance Agency License{' '}
                  <strong>{site.agencyLicense}</strong> (NPN {site.agencyNpn}).
                </li>
                <li>
                  The Agent in Charge is {site.agentInCharge.legalName}, Florida Title Agent License{' '}
                  <strong>{site.agentInCharge.license}</strong> (NPN {site.agentInCharge.npn}). She
                  has worked in title since {site.agentInCharge.inTitleSince}.
                </li>
                <li>
                  Policies are underwritten by {site.underwriter}, and our agency appointment is on
                  the Florida Department of Financial Services public record.
                </li>
              </ul>
              <p className="form-note">
                Every number above can be checked against the{' '}
                <a href={site.dfsLicenseeSearchUrl}>
                  Florida Department of Financial Services licensee search
                </a>
                . We publish them because a reader should not have to take our word for it.
              </p>
            </div>
          </section>

          <section id="team">
            <div className="section__head">
              <h2>Who does the work</h2>
              <Link href="/team" className="section__head-link">
                More about the team →
              </Link>
            </div>
            <ul className="team-grid">
              {team.map((member) => (
                <li key={member.slug} className="team-card">
                  <span className="avatar avatar--large" aria-hidden="true">
                    {initials(member.name)}
                  </span>
                  <div>
                    <p className="team-card__name">
                      <Link href={`/team/${member.slug}`}>{member.name}</Link>
                    </p>
                    <p className="team-card__role">{member.role}</p>
                    {/* No credential line is invented for somebody who does not
                        hold one: the page's whole claim is that every line on it
                        can be checked. */}
                    {member.credential ? (
                      <p className="team-card__credential">{member.credential}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section id="where">
            <h2>Where and how we close</h2>
            <div className="fact-grid">
              <div>
                <p className="fact-grid__label">Where</p>
                <p>
                  Throughout {site.serviceArea}. Most files are in{' '}
                  {priority.slice(0, -1).join(', ')} and {priority.at(-1)}.{' '}
                  <Link href="/counties">Counties we close in →</Link>
                </p>
              </div>
              <div>
                <p className="fact-grid__label">How</p>
                <p>
                  In our office, wherever the signer happens to be, or by remote online
                  notarization — whichever suits the file.
                </p>
              </div>
              <div>
                <p className="fact-grid__label">When</p>
                <p>
                  {officeHoursLine}. Signings outside those hours are arranged in advance, file by
                  file.
                </p>
              </div>
            </div>
          </section>

          <section id="why">
            <h2>Why we write these pages</h2>
            <div className="prose prose--detail">
              <p>
                Most of what is written about Florida title online is either an advertisement or a
                national article that does not survive contact with a Florida county. The pages in
                our <Link href="/title-problems">title problems library</Link> take one situation at
                a time, say what it is and what clearing it takes, and carry the name and license
                number of the agent who reviewed them. Where a fact is not yet confirmed, the page
                says so on its face instead of guessing.
              </p>
            </div>
          </section>
        </div>
      </div>

      <QuietCta variant="band" />
    </div>
  );
}
