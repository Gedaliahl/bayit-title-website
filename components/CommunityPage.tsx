// A community association page — a master association or one Neighborhood in
// it. The same interior system as the library: the answer beside the headline,
// then the detail beside a rail. The card here answers the closer's first
// questions instead of "does this stop the closing": who the association is,
// whether a second estoppel is needed, what is paid at closing, whether leases
// or sales need approval.

import Link from 'next/link';

import type { Community } from '@/lib/communities';
import { extractFaq } from '@/lib/faq';
import { formatLongDate, metaDescription } from '@/lib/seo';
import { site } from '@/lib/site';
import { getTeamMember } from '@/lib/team';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { DraftBanner } from '@/components/DraftBanner';
import { Faq } from '@/components/Faq';
import { Byline, Prose, VerifyBanner, VerifyText, markVerifyFlags } from '@/components/Prose';
import { QuietCta } from '@/components/QuietCta';
import { Rail } from '@/components/Rail';
import { FaqSchema } from '@/components/Schema';
import { Verdict } from '@/components/Verdict';

export interface CommunityCard {
  page: Community;
  /** The page's summary, rendered. */
  summaryHtml: string;
}

export function CommunityPage({
  page,
  master,
  neighborhoods = [],
  othersHtml = '',
  related = [],
}: {
  page: Community;
  /** The master page, on a Neighborhood's page. */
  master?: CommunityCard;
  /** Master page only: every Neighborhood with a page. */
  neighborhoods?: CommunityCard[];
  /** Master page only: the Neighborhoods named without a page yet, as a rendered list. */
  othersHtml?: string;
  /** Neighborhood page only: the Neighborhoods worth reading beside it. */
  related?: CommunityCard[];
}) {
  const author = page.author ? getTeamMember(page.author) : undefined;
  const authorName = author?.name ?? site.agentInCharge.displayName;

  const bodySections = page.sections.filter((section) => section.kind !== 'faq' && section.title);
  const lead = page.sections.find((section) => !section.title);

  const listHeading =
    page.kind === 'master' ? `Neighborhoods in ${page.name}` : `Elsewhere in ${master?.page.name ?? 'the community'}`;
  const listCards = page.kind === 'master' ? neighborhoods : [...(master ? [master] : []), ...related];
  const hasList = listCards.length > 0 || othersHtml !== '';

  const railItems = [
    ...bodySections.map((section) => ({ id: section.id, label: section.title })),
    ...(page.faq.length > 0 ? [{ id: 'common-questions', label: 'Common questions' }] : []),
    ...(hasList ? [{ id: 'neighborhoods', label: listHeading }] : []),
  ];

  const trail = [
    { name: 'Home', path: '/' },
    { name: 'Communities', path: '/communities' },
    ...(master ? [{ name: master.page.name, path: master.page.path }] : []),
    { name: page.name, path: page.path },
  ];

  return (
    <article>
      <FaqSchema items={extractFaq(page.raw)} />

      <section className="frame page-hero">
        <div className="page-hero__copy">
          <Breadcrumbs trail={trail} />
          <h1>{page.title}</h1>

          <p className="page-hero__lede">
            <VerifyText text={page.direct_answer} />
          </p>

          <p className="page-hero__meta">
            {page.status === 'reviewed' ? (
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
            <span>Recorded documents through {formatLongDate(page.documents_through)}</span>
          </p>
        </div>

        <Verdict
          eyebrow="The association at a glance"
          headline={page.headline ?? `${page.association} — ${page.association_type}`}
          rows={page.at_a_glance}
          action={{
            prompt: `Closing in ${page.name}?`,
            label: 'Open a title order',
            href: '/order',
          }}
        />
      </section>

      {page.status === 'draft' || page.verifyFlags.length > 0 ? (
        <div className="frame">
          {page.status === 'draft' ? <DraftBanner /> : null}
          <VerifyBanner flags={page.verifyFlags} />
        </div>
      ) : null}

      <div className="frame cols">
        <Rail label="On this page" items={railItems} />

        <div className="detail detail--narrow">
          {lead ? <Prose html={lead.html} variant="detail" /> : null}

          {bodySections.map((section) =>
            section.kind === 'practice' ? (
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

          {page.faq.length > 0 ? (
            <section id="common-questions">
              <h2>Common questions</h2>
              <Faq items={page.faq} />
            </section>
          ) : null}

          {hasList ? (
            <section id="neighborhoods">
              <h2>{listHeading}</h2>
              {listCards.length > 0 ? (
                <ul className="card-grid card-grid--fit">
                  {listCards.map(({ page: entry, summaryHtml }) => (
                    <li key={entry.path}>
                      <Link href={entry.path} className="card-link">
                        <span className="card-link__eyebrow card-link__eyebrow--deep">
                          {entry.kind === 'master' ? 'Master association' : entry.association_type}
                        </span>
                        <span className="card-link__title">{entry.name}</span>
                        <span
                          className="card-link__body"
                          dangerouslySetInnerHTML={{
                            __html: markVerifyFlags(summaryHtml || metaDescription(entry.direct_answer, 150)),
                          }}
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
              {othersHtml ? (
                <>
                  <h3>Neighborhoods whose documents we do not hold yet</h3>
                  <Prose html={othersHtml} variant="detail" />
                </>
              ) : null}
            </section>
          ) : null}

          {page.status === 'reviewed' ? (
            <Byline
              authorName={authorName}
              authorRole={author?.role ?? 'Agent in Charge'}
              credential={author?.credential ?? null}
              reviewedOn={page.reviewed_on!}
              nextReview={page.next_review!}
              withAvatar
            />
          ) : null}
        </div>
      </div>

      <QuietCta
        variant="band"
        text={`Closing on a home in ${page.name}? Send us the address and the contract date, and we will order the estoppels this community needs and tell you what the search shows.`}
      />
    </article>
  );
}
