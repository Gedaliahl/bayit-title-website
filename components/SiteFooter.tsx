import Link from 'next/link';
import { site, footerCredentialLine } from '@/lib/site';

export function SiteFooter() {
  return (
    <footer className="sitefoot">
      <div className="frame">
        <div className="sitefoot__cols">
          <div>
            <h2>Bayit Title</h2>
            <ul>
              <li>{site.address.street}</li>
              <li>
                {site.address.city}, {site.address.region} {site.address.postalCode}
              </li>
              <li>
                <a href={`tel:${site.phone}`}>{site.phoneDisplay}</a>
              </li>
              <li>
                <a href={`mailto:${site.email}`}>{site.email}</a>
              </li>
            </ul>
          </div>

          <div>
            <h2>Hours</h2>
            <ul>
              {site.hours.map((entry) => (
                <li key={entry.days}>
                  {entry.days}: {entry.open ? `${entry.open} – ${entry.close}` : 'Closed'}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2>Pages</h2>
            <ul>
              <li>
                <Link href="/title-problems">Title problems</Link>
              </li>
              <li>
                <Link href="/services">Services</Link>
              </li>
              <li>
                <Link href="/counties">Counties we close in</Link>
              </li>
              <li>
                <Link href="/team">Our team</Link>
              </li>
              <li>
                <Link href="/reviews">Reviews</Link>
              </li>
            </ul>
          </div>

          <div>
            <h2>Get started</h2>
            <ul>
              <li>
                <Link href="/order">Open a title order</Link>
              </li>
              <li>
                <Link href="/quote">Request a quote</Link>
              </li>
              <li>
                <Link href="/contact">Contact us</Link>
              </li>
            </ul>
          </div>
        </div>

        <p className="credential-line">
          {footerCredentialLine}
          <br />
          Closings throughout Florida from our office in {site.address.city}. This site explains how
          title matters generally work in Florida and what {site.name} does. It is not legal advice,
          and reading it does not create an attorney-client or agency relationship.
          <br />© {new Date().getFullYear()} {site.legalName}.
        </p>
      </div>
    </footer>
  );
}
