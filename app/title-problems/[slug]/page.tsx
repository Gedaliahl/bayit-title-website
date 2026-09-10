// The library page template. Everything about this page is arranged so that a
// machine reading it can find one quotable answer, attributed to a named
// licensed agent, with its unresolved facts clearly marked as unresolved.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getDoc, getRelated, listRoutableSlugs, isPublishable, CLUSTER_LABELS } from '@/lib/content';
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
  return listRoutableSlugs('title-problems').map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getDoc('title-problems', slug);
  if (!doc) return {};

  const description = metaDescription(doc.summary ?? doc.direct_answer);
  const path = `/title-problems/${doc.slug}`;

  return {
    title: doc.title,
    description,
    alternates: { canonical: path },
    // A draft is only ever reachable on a preview build, and must never be indexed.
    ...(doc.status === 'draft' ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      type: 'article',
      title: doc.title,
      description,
      url: absoluteUrl(path),
      publishedTime: doc.reviewed_on,
      modifiedTime: doc.reviewed_on,
    },
  };
}

export default async function TitleProblemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = await getDoc('title-problems', slug);
  if (!doc || !isPublishable(doc)) notFound();

  const [related, matchedReviews] = await Promise.all([
    getRelated(doc),
    getReviewsByTags(doc.review_tags, 1),
  ]);

  const author = doc.author ? site.team.find((member) => member.slug === doc.author) : undefined;
  const faq = extractFaq(doc.raw);
  const path = `/title-problems/${doc.slug}`;

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
      <FaqSchema items={faq} />

      <div className="measure">
        <Breadcrumbs
          trail={[
            { name: 'Home', path: '/' },
            { name: 'Title problems', path: '/title-problems' },
            { name: doc.title, path },
          ]}
        />

        <p className="eyebrow" style={{ marginTop: '1.5rem' }}>
          {CLUSTER_LABELS[doc.cluster]}
        </p>
        <h1>{doc.title}</h1>

        {/* The block an AI assistant lifts. Complete and quotable on its own. */}
        <AnswerPanel text={doc.direct_answer} />

        {doc.status === 'draft' ? <DraftBanner /> : null}
        <VerifyBanner flags={doc.verifyFlags} />

        <QuickFacts facts={doc.quick_facts ?? []} />

        <Prose html={doc.html} />

        {matchedReviews.length > 0 ? <ReviewPullQuote review={matchedReviews[0]} /> : null}

        {related.length > 0 ? (
          <section>
            <h2>Related situations</h2>
            <ul className="linklist">
              {related.map((entry) => (
                <li key={entry.slug}>
                  <Link href={`/title-problems/${entry.slug}`}>
                    {entry.title}
                    <span className="linklist__sub">{CLUSTER_LABELS[entry.cluster]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

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
