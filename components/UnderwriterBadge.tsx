import Image from 'next/image';

import { underwriterLine } from '@/lib/site';

/**
 * The underwriter credit, carried under the homepage figure strip. Who actually
 * insures the policy is the same kind of statement as the counties count and
 * the review rating beside it — a checkable fact about the agency rather than a
 * claim — so it reads as the last line of that strip.
 *
 * The mark is the underwriter's own corporate lockup, shown as the credit an
 * appointed agent may carry. It is decorative in the accessibility sense — the
 * sentence beside it names the company in full — so its alt text is empty
 * rather than a second reading of the same words.
 */
export function UnderwriterBadge() {
  return (
    <p className="underwriter">
      <Image
        src="/brand/first-american.png"
        alt=""
        width={472}
        height={110}
        className="underwriter__mark"
        // The stylesheet sets the mark 30px tall, so it renders about 130px
        // wide; without this, next/image would size the srcset from the 472px
        // intrinsic width and ship a needlessly large file for the slot.
        sizes="130px"
      />
      <span className="underwriter__line">{underwriterLine}</span>
    </p>
  );
}
