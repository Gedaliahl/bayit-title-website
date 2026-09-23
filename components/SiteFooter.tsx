import Link from 'next/link';
import { site, footerCredentialLine } from '@/lib/site';
import { PRIVACY_PUBLISHED } from '@/lib/privacy';

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

          {/* The two link columns are the footer's navigation, and each is its
              own landmark named by its heading, so a screen reader's landmark
              list offers "Pages" and "Get started" rather than two "Footer"s.
              A single <nav> around both would have to sit in the grid as one
              cell, or be taken out of it with display: contents, which some
              browsers still answer by dropping the landmark. */}
          <nav aria-labelledby="footer-pages">
            <h2 id="footer-pages">Pages</h2>
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
                <Link href="/partners">For realtors and mortgage brokers</Link>
              </li>
              {/* About and the team came off the masthead when it was cut to
                  four links. The footer is now the only site-wide link to
                  /about, so it is not optional here. */}
              <li>
                <Link href="/about">About Bayit Title</Link>
              </li>
              <li>
                <Link href="/team">Our team</Link>
              </li>
              <li>
                <Link href="/reviews">Reviews</Link>
              </li>
            </ul>
          </nav>

          <nav aria-labelledby="footer-costs">
            <h2 id="footer-costs">Closing costs</h2>
            <ul>
              <li>
                <Link href="/estimate">Closing cost calculator</Link>
              </li>
              <li>
                <Link href="/closing-costs/title-insurance-calculator">Title insurance calculator</Link>
              </li>
              <li>
                <Link href="/closing-costs/doc-stamp-calculator">Doc stamp calculator</Link>
              </li>
              <li>
                <Link href="/closing-costs/who-pays-title-insurance">Who pays title insurance</Link>
              </li>
              <li>
                <Link href="/closing-costs/buyer">Buyer closing costs</Link>
              </li>
              <li>
                <Link href="/closing-costs/seller">Seller closing costs</Link>
              </li>
              <li>
                <Link href="/closing-costs">All closing costs</Link>
              </li>
            </ul>
          </nav>
          <nav aria-labelledby="footer-start">
            <h2 id="footer-start">Get started</h2>
            <ul>
              <li>
                <Link href="/order">Open a title order</Link>
              </li>
              <li>
                <Link href="/quote">Request a quote</Link>
              </li>
              <li>
                <a href={`tel:${site.phone}`}>Call {site.phoneDisplay}</a>
              </li>
              <li>
                <Link href="/contact">Contact us</Link>
              </li>
              {/* Linked only once reviewed. A footer link to a 404 is worse
                  than no link, and the policy stays a draft until counsel has
                  been through it. */}
              {PRIVACY_PUBLISHED ? (
                <li>
                  <Link href="/privacy">Privacy</Link>
                </li>
              ) : null}
            </ul>
          </nav>
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
