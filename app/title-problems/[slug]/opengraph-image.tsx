import { notFound } from 'next/navigation';

import { getDoc, isPublishable, listRoutableSlugs } from '@/lib/content';
import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const alt = 'Bayit Title — Florida title problem';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// Same gate as the page itself: a draft has no route in production, so it has
// no card either.
export function generateStaticParams() {
  return listRoutableSlugs('title-problems').map((slug) => ({ slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = await getDoc('title-problems', slug);
  // Checked here as well as in the params. An image route renders any slug it
  // is asked for, so a draft's URL, guessed or leaked, would otherwise return
  // a card with the draft's title on it.
  if (!doc || !isPublishable(doc)) notFound();

  // The title is already the reader's own question — the best possible card copy.
  return ogImage({ eyebrow: 'Florida title problems', title: doc.title });
}
