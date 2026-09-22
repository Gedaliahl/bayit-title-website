// The two closing-cost pages, side by side.
//
// Each line on a Florida closing statement falls on one side or the other, and
// a reader usually arrives knowing which side they are on. So this page does no
// arithmetic of its own: it says what the two pages cover, in the words those
// pages already use, and sends the reader to the right one.

import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '@/components/Breadcrumbs';
import { QuietCta } from '@/components/QuietCta';
import { baseOpenGraph, metaDescription } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Florida closing costs, buyer and seller',
  description: metaDescription(
    'What a buyer and a seller pay at a Florida closing: statutory taxes and recording, the ' +
      'promulgated title premium, and the fees no rule sets, each cited.',
  ),
  alternates: { canonical: '/closing-costs' },
  openGraph: { ...baseOpenGraph, url: '/closing-costs' },
};

const SIDES = [
  {
    href: '/closing-costs/buyer',
    eyebrow: 'Buying',
    title: 'Buyer closing costs in Florida',
    body:
      'The mortgage stamp tax, intangible tax and recording the statute sets, the promulgated ' +
      'premium, and the fees no rule sets.',
  },
  {
    href: '/closing-costs/seller',
    eyebrow: 'Selling',
    title: 'Seller closing costs in Florida',
    body:
      'The deed stamp tax at the county’s rate, the owner’s policy where custom puts it on the ' +
      'seller, the reissue rate, payoffs and balances.',
  },
];

export default function ClosingCostsPage() {
  return (
    <div className="frame section">
      <div className="measure">
        <Breadcrumbs
          trail={[
            { name: 'Home', path: '/' },
            { name: 'Closing costs', path: '/closing-costs' },
          ]}
        />
        <h1 className="after-crumbs">Florida closing costs</h1>
        <p className="lede">
          Some lines are set by statute, the title premium is set by rule, and the rest are set by
          whoever provides them. Which side pays each line is decided by the purchase contract.
        </p>

        <p>
          For a specific property, <Link href="/estimate">estimate from the address</Link> or{' '}
          <Link href="/estimate?mode=numbers">from the price and loan</Link>. For the lines no rule
          sets, <Link href="/quote">request a quote</Link>.
        </p>

        <ul className="card-grid card-grid--fit">
          {SIDES.map((side) => (
            <li key={side.href}>
              <Link href={side.href} className="card-link">
                <span className="card-link__eyebrow">{side.eyebrow}</span>
                <span className="card-link__title">{side.title}</span>
                <span className="card-link__body">{side.body}</span>
              </Link>
            </li>
          ))}
        </ul>

        <QuietCta
          text="Send the county and the price and we will itemize it."
          action="Request a quote"
          href="/quote"
        />
      </div>
    </div>
  );
}
