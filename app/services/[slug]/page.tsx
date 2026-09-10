import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getDoc, listRoutableSlugs, isPublishable } from '@/lib/content';
import { getReviewsByTags } from '@/lib/reviews';
import { extractFaq } from '@/lib/faq';
import { absoluteUrl, metaDescription } from '@/lib/seo';
import { site } from '@/lib/site';
import { AnswerPanel, Byline, Prose, VerifyBanner } from '@/components/Prose';
import { DraftBanner } from '@/components/DraftBanner';
import { QuickFacts } from '@/components/QuickFacts';
import { QuietCta } from '@/components/QuietCta';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ArticleSchema, FaqSchema } from '@/components/Schema';
import { ReviewPullQuote } from '@/components/Reviews';

export const dynamicParams = false;

export function generateStaticParams() {
  return listRoutableSlugs('services').map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getDoc('services', slug);
  if (!doc) return {};

  const description = metaDescription(doc.summary ?? doc.direct_answer);
  const path = `/services/${doc.slug}`;

  return {
    title: doc.title,
    description,
    alternates: { canonical: path },
    // A draft is only ever reachable on a preview build, and must never be indexed.
    ...(doc.status === 'draft' ? { robots: { index: false, follow: false } } : {}),
    openGraph: { type: 'article', title: doc.title, description, url: absoluteUrl(path) },
  };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = await getDoc('services', slug);
  if (!doc || !isPublishable(doc)) notFound();

  const matchedReviews = await getReviewsByTags(doc.review_tags, 1);
  const author = doc.author ? site.team.find((member) => member.slug === doc.author) : undefined;
  const path = `/services/${doc.slug}`;

  return (
    <article className="frame section">
      {doc.status === 'reviewed' ? (
        <ArticleSchema
          headline={doc.title}
          description={metaDescription(doc.direct_answer)}
          path={path}
          authorName={author?.name ?? site.agentInCharge.displayName}
          authorSlug={doc.author!}
          reviewedOn={doc.reviewed_on!}
        />
      ) : null}
      <FaqSchema items={extractFaq(doc.raw)} />

      <div className="measure">
        <Breadcrumbs
          trail={[
            { name: 'Home', path: '/' },
            { name: 'Services', path: '/services' },
            { name: doc.title, path },
          ]}
        />
        <h1 style={{ marginTop: '1.5rem' }}>{doc.title}</h1>

        <AnswerPanel text={doc.direct_answer} />
        {doc.status === 'draft' ? <DraftBanner /> : null}
        <VerifyBanner flags={doc.verifyFlags} />
        <QuickFacts facts={doc.quick_facts ?? []} />
        <Prose html={doc.html} />

        {matchedReviews.length > 0 ? <ReviewPullQuote review={matchedReviews[0]} /> : null}

        {doc.status === 'reviewed' ? (
          <Byline
            authorName={author?.name ?? site.agentInCharge.displayName}
            authorRole={author?.role ?? 'Founder'}
            credential={author?.credential ?? null}
            reviewedOn={doc.reviewed_on!}
            nextReview={doc.next_review!}
          />
        ) : null}

        <QuietCta />
      </div>
    </article>
  );
}
