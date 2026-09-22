// The library index. The card at the top is a router rather than an answer: a
// reader arriving here has something in front of them and wants to know which
// pile it belongs in, which is a shorter question than "which of these eight
// pages is mine".

import type { Metadata } from 'next';
import Link from 'next/link';

import {
  getAllDocs,
  getDocsByCluster,
  CLUSTER_CAPTIONS,
  type Doc,
} from '@/lib/content';
import { baseOpenGraph, formatReviewDate, metaDescription } from '@/lib/seo';
import { site } from '@/lib/site';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { QuietCta } from '@/components/QuietCta';
import { Verdict, VerdictLink, VerdictLinks } from '@/components/Verdict';
import { StepBand } from '@/components/StepBand';
import { Rail } from '@/components/Rail';

export const metadata: Metadata = {
  title: 'Florida title problems, explained',
  description: metaDescription(
    'Specific title problems that come up on Florida closings — what each one is, what it does to a ' +
      'closing, and how it gets cleared. Written and reviewed by a licensed Florida title agent.',
  ),
  alternates: { canonical: '/title-problems' },
  openGraph: { ...baseOpenGraph, url: '/title-problems' },
};

/**
 * The questions the card asks, and the cluster each one lands in.
 *
 * Written in the reader's terms rather than the library's: somebody holding a
 * search result knows a court is involved before they know the word
 * "distressed". A row is dropped when its cluster has no published page, so the
 * card never routes to an empty heading, and each example under a row names the
 * page it stands for, so the card never promises a page that is still a draft.
 */
const ROUTES = [
  {
    cluster: 'liens',
    label: 'Something recorded against the property or seller',
    examples: [
      ['judgments', 'judgment-against-seller-before-closing-florida'],
      ['permits', 'open-permits-before-closing-florida'],
    ],
  },
  {
    cluster: 'distressed',
    label: 'A court is involved',
    examples: [
      ['bankruptcy', 'buying-property-bankruptcy-estate-florida'],
      ['lawsuits, lis pendens', 'litigation-against-seller-flip-florida'],
    ],
  },
  {
    cluster: 'process',
    label: 'A signing or contract question',
    examples: [
      ['overseas sellers', 'foreign-seller-signing-from-abroad-florida'],
      ['non-standard contracts', 'non-standard-purchase-contract-florida-closing'],
    ],
  },
  {
    cluster: 'property-type',
    label: 'The property itself',
    examples: [['HOA and condominium approval', 'hoa-approval-delay-closing-florida']],
  },
  {
    cluster: 'survey',
    label: 'How the property is reached',
    examples: [['legal access, easements', 'no-legal-access-landlocked-property-florida']],
  },
] as const;

/**
 * How every page in the library is built, said once, here.
 *
 * Only what every published page has. The verdict card and the step band are
 * optional front-matter, and a page without them would make this band a promise
 * the page does not keep, so each is described only while every page carries it.
 */
function howPagesAreBuilt(docs: Doc[]) {
  const every = (has: (doc: Doc) => boolean) => docs.length > 0 && docs.every(has);

  return [
    every((doc) => Boolean(doc.verdict?.headline))
      ? {
          label: 'First',
          title: 'Does it stop the closing?',
          body:
            'A verdict card at the top: who resolves it, how long, what it costs, whether a ' +
            'lawyer is needed.',
        }
      : {
          label: 'First',
          title: 'The short answer',
          body: 'A few sentences at the top that answer the question on their own.',
        },
    ...(every((doc) => (doc.steps?.length ?? 0) > 0)
      ? [
          {
            label: 'Then',
            title: 'What happens, in order',
            body: 'The steps from search to resolution, so you can see where your file is.',
          },
        ]
      : []),
    {
      label: 'Then',
      title: 'The detail, with the statute',
      body:
        'Why it works the way it does, what the underwriter will want, and when it is a ' +
        'lawyer’s question.',
    },
    {
      label: 'Always',
      title: 'Who reviewed it, and when',
      body:
        'Name, license number, review date and next review. Where a fact is unconfirmed, the ' +
        'page says so.',
    },
  ];
}

/** The line under each card: when it was reviewed, or that it has not been. */
function cardMeta(doc: Doc): string | null {
  if (doc.status === 'draft') return 'Unreviewed draft — preview only';
  const reviewed = doc.reviewed_on ? formatReviewDate(doc.reviewed_on) : null;
  if (reviewed) return `Reviewed · ${reviewed}`;
  return null;
}

export default async function TitleProblemsIndex() {
  const [groups, all] = await Promise.all([
    getDocsByCluster('title-problems'),
    getAllDocs('title-problems'),
  ]);

  const published = new Set(all.map((doc) => doc.slug));
  const routes = ROUTES.map((route) => {
    const sub = route.examples
      .filter(([, slug]) => published.has(slug))
      .map(([example]) => example)
      .join(', ');
    return {
      cluster: route.cluster,
      label: route.label,
      sub: sub.charAt(0).toUpperCase() + sub.slice(1),
    };
  }).filter((route) => route.sub);
  const howBuilt = howPagesAreBuilt(all);

  return (
    <div>
      <section className="frame page-hero">
        <div className="page-hero__copy">
          <Breadcrumbs
            trail={[
              { name: 'Home', path: '/' },
              { name: 'Title problems', path: '/title-problems' },
            ]}
          />
          <h1>Florida title problems, explained</h1>
          <p className="page-hero__lede">
            A title search turns up something. The question is always the same: what is it, does it
            stop the closing, and what does it take to clear it. These pages answer that for the
            situations we actually see on Florida files.
          </p>
          <p className="page-hero__meta">
            <span>
              <span className="page-hero__dot" aria-hidden="true" />
              {all.length} page{all.length === 1 ? '' : 's'}, each reviewed by a licensed Florida
              title agent
            </span>
            <span>Dated, and re-reviewed every 12 months</span>
          </p>
        </div>

        {routes.length > 0 ? (
          <Verdict
            eyebrow="Start here"
            headline="What did the search turn up?"
            action={{
              prompt: 'Not listed? Describe the file.',
              label: site.phoneDisplay,
              href: `tel:${site.phone}`,
            }}
          >
            <VerdictLinks>
              {routes.map((route) => (
                <VerdictLink
                  key={route.cluster}
                  href={`#${route.cluster}`}
                  label={route.label}
                  sub={route.sub}
                />
              ))}
            </VerdictLinks>
          </Verdict>
        ) : null}
      </section>

      <StepBand
        heading="How every page is built"
        caption="Same shape each time, so you know where to look"
        columns={howBuilt.length >= 4 ? 4 : 3}
        steps={howBuilt}
      />

      <div className="frame cols cols--tight">
        <Rail
          label="Browse by situation"
          items={groups.map((group) => ({
            id: group.cluster,
            label: group.label,
            count: group.docs.length,
          }))}
        />

        <div className="detail detail--plain">
          {groups.map((group) => (
            <section id={group.cluster} key={group.cluster}>
              <div className="section__head">
                <h2>{group.label}</h2>
                {CLUSTER_CAPTIONS[group.cluster] ? (
                  <span className="caption">{CLUSTER_CAPTIONS[group.cluster]}</span>
                ) : null}
              </div>
              <ul className="card-grid">
                {group.docs.map((doc) => {
                  const meta = cardMeta(doc);
                  return (
                    <li key={doc.slug}>
                      <Link href={`/title-problems/${doc.slug}`} className="card-link">
                        {doc.verdict ? (
                          <span className="card-link__eyebrow">
                            Stops the closing? {doc.verdict.short}
                          </span>
                        ) : null}
                        <span className="card-link__title">{doc.title}</span>
                        <span className="card-link__body">
                          {metaDescription(doc.summary ?? doc.direct_answer, 170)}
                        </span>
                        {meta ? <span className="card-link__meta">{meta}</span> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {groups.length === 0 ? <p className="muted">No pages are published yet.</p> : null}
        </div>
      </div>

      <QuietCta variant="band" />
    </div>
  );
}
