import type { Metadata } from 'next';

import { getCounties } from '@/lib/locations';
import { site } from '@/lib/site';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { LeadForm } from '@/components/LeadForm';

export const metadata: Metadata = {
  title: 'Contact',
  description: `Reach ${site.legalName} in ${site.address.city}, Florida: ${site.phoneDisplay}, ${site.email}.`,
  alternates: { canonical: '/contact' },
};

export default async function ContactPage() {
  const counties = await getCounties();

  return (
    <div className="frame section">
      <div className="measure">
        <Breadcrumbs
          trail={[
            { name: 'Home', path: '/' },
            { name: 'Contact', path: '/contact' },
          ]}
        />
        <h1 style={{ marginTop: '1.5rem' }}>Contact us</h1>

        <h2 style={{ marginTop: '1.5rem' }}>The office</h2>
        <p>
          {site.address.street}
          <br />
          {site.address.city}, {site.address.region} {site.address.postalCode}
          <br />
          <a href={`tel:${site.phone}`}>{site.phoneDisplay}</a>
          <br />
          <a href={`mailto:${site.email}`}>{site.email}</a>
        </p>

        <h2>Hours</h2>
        <ul>
          {site.hours.map((entry) => (
            <li key={entry.days}>
              {entry.days}: {entry.open ? `${entry.open} – ${entry.close}` : 'Closed'}
            </li>
          ))}
        </ul>
        <p className="form-note">
          Signings outside office hours are arranged in advance on a specific file. We do not staff
          the phone after hours.
        </p>

        <h2>A word about wire fraud</h2>
        <p>
          We will never send you wire instructions by email, and we will never email you a change to
          instructions already given. If you receive anything that appears to come from us with
          account details in it, do not act on it. Call {site.phoneDisplay} using the number on this
          page — not a number in the message — and confirm with us directly.
        </p>

        <h2>Send us a note</h2>
        <LeadForm
          source="contact"
          counties={counties.map((c) => ({ value: c.slug, label: c.name }))}
          submitLabel="Send"
          successMessage={`Received. We will reply during office hours. If it is time-sensitive, call ${site.phoneDisplay}.`}
        />
      </div>
    </div>
  );
}
