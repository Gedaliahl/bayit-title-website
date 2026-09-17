import Image from 'next/image';

import { underwriterLine } from '@/lib/site';

/**
 * The underwriter credit, carried at the top of the homepage hero so it is on
 * screen before anyone scrolls. The first question a buyer, a lender or a
 * co-operating agent asks a title agency is who actually insures the policy,
 * and answering it above the fold is worth the one line it takes.
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
        // intrinsic width and ship a needlessly large file at the top of the
        // page it is trying not to slow down.
        sizes="130px"
        priority
      />
      <span className="underwriter__line">{underwriterLine}</span>
    </p>
  );
}
