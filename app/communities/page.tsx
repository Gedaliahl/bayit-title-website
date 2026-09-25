// The communities index: every master community association with a page, by
// county. It has nothing to list until a community page is publishable here,
// and answers 404 rather than render an empty page.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getAllCommunityPages, renderLine } from '@/lib/communities';
import { getCounties } from '@/lib/locations';
import { metaDescription, siteOpenGraph } from '@/lib/seo';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { markVerifyFlags } from '@/components/Prose';
import { QuietCta } from '@/components/QuietCta';

const description =
  'What the recorded documents of South Florida community associations say about a resale: fees at closing, leasing, approvals and title points.';

export const metadata: Metadata = {
  title: 'Community associations',
  description,
  alternates: { canonical: '/communities' },
  openGraph: { ...siteOpenGraph, title: 'Community associations', description, url: '/communities' },
};

export default async function CommunitiesIndex() {
  const masters = (await getAllCommunityPages()).filter((page) => page.kind === 'master');
  if (masters.length === 0) notFound();

  const counties = await getCounties();
  const countyName = (slug: string) => counties.find((county) => county.slug === slug)?.name ?? slug;
  const byCounty = [...new Set(masters.map((page) => page.county))].sort().map((county) => ({
    county,
    pages: masters.filter((page) => page.county === county),
  }));
  const summaries = new Map(
    await Promise.all(
      masters.map(async (page) => [page.path, page.summary ? await renderLine(page.summary) : ''] as const),
    ),
  );

  return (
    <article>
      <section className="frame page-hero">
        <div className="page-hero__copy">
          <Breadcrumbs
            trail={[
              { name: 'Home', path: '/' },
              { name: 'Communities', path: '/communities' },
            ]}
          />
          <h1>Community associations</h1>
          <p className="page-hero__lede">
            What each community&rsquo;s recorded declaration, amendments and rules say about a
            resale: which estoppels to order, what is paid to the association at closing, whether a
            sale or lease needs approval, and the title points we look for. Each page cites the
            recorded instruments it is written from and gives the date of the newest one.
          </p>
        </div>
      </section>

      <div className="frame">
        {byCounty.map(({ county, pages }) => (
          <section key={county} className="section">
            <h2>{countyName(county)}</h2>
            <ul className="card-grid card-grid--fit">
              {pages.map((page) => (
                <li key={page.path}>
                  <Link href={page.path} className="card-link">
                    <span className="card-link__eyebrow card-link__eyebrow--deep">
                      {page.status === 'draft' ? 'Unreviewed draft' : page.association_type}
                    </span>
                    <span className="card-link__title">{page.name}</span>
                    <span
                      className="card-link__body"
                      dangerouslySetInnerHTML={{
                        __html: markVerifyFlags(summaries.get(page.path) || metaDescription(page.direct_answer, 150)),
                      }}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <QuietCta variant="band" />
    </article>
  );
}
