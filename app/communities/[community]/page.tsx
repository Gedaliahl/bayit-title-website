// A master community association's page: what its recorded documents say about
// a resale, the questions buyers and agents ask about its rules, and a card for
// each Neighborhood inside it that has its own page.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { isPublishable, toHtml } from '@/lib/content';
import {
  getCommunity,
  getNeighborhoods,
  listRoutableCommunities,
  renderLine,
} from '@/lib/communities';
import { fittedTitle, metaDescription, siteOpenGraph } from '@/lib/seo';
import { CommunityPage } from '@/components/CommunityPage';

export const dynamicParams = false;

export function generateStaticParams() {
  return listRoutableCommunities().map((community) => ({ community }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ community: string }>;
}): Promise<Metadata> {
  const { community } = await params;
  const page = await getCommunity(community);
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

export default async function MasterCommunityPage({
  params,
}: {
  params: Promise<{ community: string }>;
}) {
  const { community } = await params;
  const page = await getCommunity(community);
  if (!page || !isPublishable(page)) notFound();

  const neighborhoods = await getNeighborhoods(community);
  const cards = await Promise.all(
    neighborhoods.map(async (entry) => ({
      page: entry,
      summaryHtml: entry.summary ? await renderLine(entry.summary) : '',
    })),
  );
  const othersHtml =
    page.others.length > 0
      ? await toHtml(page.others.map((other) => `- **${other.name}.** ${other.note}`).join('\n'))
      : '';

  return <CommunityPage page={page} neighborhoods={cards} othersHtml={othersHtml} />;
}
