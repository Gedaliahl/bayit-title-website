import { notFound } from 'next/navigation';

import { getDoc, listRoutableSlugs } from '@/lib/content';
import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const alt = 'Bayit Title — Florida closing services';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return listRoutableSlugs('services').map((slug) => ({ slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = await getDoc('services', slug);
  if (!doc) notFound();

  return ogImage({ eyebrow: 'Closing services', title: doc.title });
}
