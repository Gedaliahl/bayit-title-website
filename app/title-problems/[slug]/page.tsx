// The library page template. Everything about this page is arranged so that a
// machine reading it can find one quotable answer, attributed to a named
// licensed agent, with its unresolved facts clearly marked as unresolved.
//
// The reader's first question is never "what is a judgment lien". It is "does
// this stop my closing". So the page answers that first — in the verdict card
// beside the headline and in the lede under it, both server-rendered into the
// first HTML — then shows the order the work happens in, and only then
// explains. The detail sits beside a rail that says what is in it, because a
// reader with a live file is looking for one section rather than reading
// through.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  getDoc,
  getRelated,
  listRoutableSlugs,
  isPublishable,
  CLUSTER_LABELS,
  type Doc,
} from '@/lib/content';
import { getReviewsByTags } from '@/lib/reviews';
import { extractFaq } from '@/lib/faq';
import { absoluteUrl, formatLongDate, metaDescription } from '@/lib/seo';
import { site } from '@/lib/site';
import { Byline, Prose, VerifyBanner, VerifyText } from '@/components/Prose';
import { DraftBanner } from '@/components/DraftBanner';
import { QuickFacts } from '@/components/QuickFacts';
import { QuietCta } from '@/components/QuietCta';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ArticleSchema, FaqSchema } from '@/components/Schema';
import { ReviewPullQuote } from '@/components/Reviews';
import { Verdict } from '@/components/Verdict';
import { StepBand } from '@/components/StepBand';
import { Rail } from '@/components/Rail';
import { Faq } from '@/components/Faq';

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

/**
 * The quick-facts box, minus anything the verdict card already answers.
 *
 * "Typical timeline" in the rail under a "Timeline" row at the top of the page
 * is the same fact in two shapes, and the second one is where a reader starts
 * checking whether the two agree. Matched on containment rather than equality,
 * because the two write the same fact at different lengths.
 */
function railFacts(doc: Doc) {
  const answered = (doc.verdict?.rows ?? []).map((row) => row.term.toLowerCase());

  return (doc.quick_facts ?? []).filter((fact) => {
    const term = fact.term.toLowerCase();
    return !answered.some((row) => term.includes(row) || row.includes(term));
  });
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
  const authorName = author?.name ?? site.agentInCharge.displayName;
  const faq = extractFaq(doc.raw);
  const path = `/title-problems/${doc.slug}`;

  // Sections the template lays out itself: the questions become disclosures,
  // and anything before the first heading has no anchor to link to.
  const bodySections = doc.sections.filter((section) => section.kind !== 'faq' && section.title);
  const lead = doc.sections.find((section) => !section.title);

  const railItems = [
    ...bodySections.map((section) => ({ id: section.id, label: section.title })),
    ...(faq.length > 0 ? [{ id: 'common-questions', label: 'Common questions' }] : []),
  ];

  return (
    <article>
      {doc.status === 'reviewed' ? (
        <ArticleSchema
          headline={doc.title}
          description={metaDescription(doc.direct_answer)}
          path={path}
          authorName={authorName}
          authorSlug={doc.author!}
          reviewedOn={doc.reviewed_on!}
        />
      ) : null}
      <FaqSchema items={faq} />

      <section className="frame page-hero">
        <div className="page-hero__copy">
          <Breadcrumbs
            trail={[
              { name: 'Home', path: '/' },
              { name: 'Title problems', path: '/title-problems' },
              { name: doc.title, path },
            ]}
          />
          <h1>{doc.title}</h1>

          {/* The block an AI assistant lifts. Complete and quotable on its own. */}
          <p className="page-hero__lede">
            <VerifyText text={doc.direct_answer} />
          </p>

          <p className="page-hero__meta">
            {doc.status === 'reviewed' ? (
              <span>
                <span className="page-hero__dot" aria-hidden="true" />
                Reviewed by {authorName}
                {author?.credential ? `, ${author.credential}` : ''}
              </span>
            ) : (
              <span>
                <span className="page-hero__dot" aria-hidden="true" />
                Unreviewed draft
              </span>
            )}
            {doc.reviewed_on ? <span>{formatLongDate(doc.reviewed_on)}</span> : null}
            {doc.read_time ? <span>{doc.read_time} min read</span> : null}
          </p>
        </div>

        {doc.verdict?.headline ? (
          <Verdict
            eyebrow="Does this stop the closing?"
            headline={doc.verdict.headline}
            rows={doc.verdict.rows}
            action={{
              prompt: 'Have a file with this on it?',
              label: 'Send us the address',
              href: '/order',
            }}
          />
        ) : null}
      </section>

      {doc.status === 'draft' || doc.verifyFlags.length > 0 ? (
        <div className="frame">
          {doc.status === 'draft' ? <DraftBanner /> : null}
          <VerifyBanner flags={doc.verifyFlags} />
        </div>
      ) : null}

      {doc.steps && doc.steps.length > 0 ? (
        <StepBand
          heading="What happens, in order"
          caption={`${doc.steps.length} steps from search to resolution`}
          columns={doc.steps.length >= 5 ? 5 : doc.steps.length >= 4 ? 4 : 3}
          steps={doc.steps.map((step, index) => ({
            label: `Step ${index + 1}`,
            title: step.title,
            body: step.body,
          }))}
        />
      ) : null}

      <div className="frame cols">
        <Rail label="The detail" items={railItems}>
          <QuickFacts facts={railFacts(doc)} variant="rail" />
        </Rail>

        <div className="detail detail--narrow">
          {lead ? <Prose html={lead.html} variant="detail" /> : null}

          {bodySections.map((section) =>
            section.kind === 'practice' ? (
              // Where the page stops explaining Florida law and starts saying
              // what this office does. Set apart so the reader can see which is
              // which rather than take our practice for the law.
              <section id={section.id} key={section.id} className="callout">
                <p className="callout__eyebrow">Our practice</p>
                <h2>{section.title}</h2>
                <Prose html={section.html} variant="detail" />
              </section>
            ) : (
              <section id={section.id} key={section.id}>
                <h2>{section.title}</h2>
                <Prose html={section.html} variant="detail" />
              </section>
            ),
          )}

          {faq.length > 0 ? (
            <section id="common-questions">
              <h2>Common questions</h2>
              <Faq items={faq} />
            </section>
          ) : null}

          {matchedReviews.length > 0 ? (
            <section>
              <ReviewPullQuote review={matchedReviews[0]} />
            </section>
          ) : null}

          {related.length > 0 ? (
            <section id="related">
              <h2>Related situations</h2>
              <ul className="card-grid card-grid--fit">
                {related.map((entry) => (
                  <li key={entry.slug}>
                    <Link href={`/title-problems/${entry.slug}`} className="card-link">
                      <span className="card-link__eyebrow card-link__eyebrow--deep">
                        {CLUSTER_LABELS[entry.cluster]}
                      </span>
                      <span className="card-link__title">{entry.title}</span>
                      <span className="card-link__body">
                        {metaDescription(entry.summary ?? entry.direct_answer, 150)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {doc.status === 'reviewed' ? (
            <Byline
              authorName={authorName}
              authorRole={author?.role ?? 'Founder'}
              credential={author?.credential ?? null}
              reviewedOn={doc.reviewed_on!}
              nextReview={doc.next_review!}
              withAvatar
            />
          ) : null}
        </div>
      </div>

      <QuietCta variant="band" />
    </article>
  );
}
