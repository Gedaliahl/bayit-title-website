// One Neighborhood or sub-association inside a master community: what its own
// documents add to the master's, cross-linked to the master page and to the
// Neighborhoods it is worth reading beside.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { isPublishable } from '@/lib/content';
import {
  getCommunity,
  getRelatedNeighborhoods,
  listRoutableNeighborhoods,
  renderLine,
  type Community,
} from '@/lib/communities';
import { fittedTitle, metaDescription, siteOpenGraph } from '@/lib/seo';
import { CommunityPage } from '@/components/CommunityPage';

export const dynamicParams = false;

export function generateStaticParams() {
  return listRoutableNeighborhoods();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ community: string; neighborhood: string }>;
}): Promise<Metadata> {
  const { community, neighborhood } = await params;
  const page = await getCommunity(community, neighborhood);
  if (!page) return {};

  const description = metaDescription(page.summary ?? page.direct_answer);

  return {
    title: fittedTitle(page.seo_title ?? page.title, page.title),
    description,
    alternates: { canonical: page.path },
    ...(page.status === 'draft' ? { robots: { index: false, follow: false } } : {}),
    openGraph: { ...siteOpenGraph, title: page.title, description, url: page.path },
  };
}

async function card(page: Community) {
  return { page, summaryHtml: page.summary ? await renderLine(page.summary) : '' };
}

export default async function NeighborhoodPage({
  params,
}: {
  params: Promise<{ community: string; neighborhood: string }>;
}) {
  const { community, neighborhood } = await params;
  const [page, master] = await Promise.all([getCommunity(community, neighborhood), getCommunity(community)]);
  if (!page || !master || !isPublishable(page) || !isPublishable(master)) notFound();

  const related = await getRelatedNeighborhoods(page);

  return (
    <CommunityPage
      page={page}
      master={await card(master)}
      related={await Promise.all(related.map(card))}
    />
  );
}
