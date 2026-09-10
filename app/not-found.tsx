import Link from 'next/link';
import { site } from '@/lib/site';

export default function NotFound() {
  return (
    <div className="frame section">
      <div className="measure">
        <h1>That page isn&rsquo;t here</h1>
        <p className="lede">
          It may have moved when we replaced the old site. Everything below is current.
        </p>
        <ul className="linklist">
          <li>
            <Link href="/title-problems">Title problems, explained</Link>
          </li>
          <li>
            <Link href="/services">What we do</Link>
          </li>
          <li>
            <Link href="/counties">Counties we close in</Link>
          </li>
          <li>
            <Link href="/order">Open a title order</Link>
          </li>
          <li>
            <Link href="/contact">Contact us</Link>
          </li>
        </ul>
        <p className="form-note">
          If you were looking for something specific, call {site.phoneDisplay} and we will point you
          at it.
        </p>
      </div>
    </div>
  );
}
