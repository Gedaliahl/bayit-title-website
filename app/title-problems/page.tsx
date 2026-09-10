import type { Metadata } from 'next';
import Link from 'next/link';

import { getAllDocs, getDocsByCluster } from '@/lib/content';
import { metaDescription } from '@/lib/seo';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Florida title problems, explained',
  description:
    'Specific title problems that come up on Florida closings — what each one is, what it does to a ' +
    'closing, and how it gets cleared. Written and reviewed by a licensed Florida title agent.',
  alternates: { canonical: '/title-problems' },
};

export default async function TitleProblemsIndex() {
  const [groups, all] = await Promise.all([getDocsByCluster('title-problems'), getAllDocs('title-problems')]);

  return (
    <div className="frame section">
      <div className="measure">
        <Breadcrumbs
          trail={[
            { name: 'Home', path: '/' },
            { name: 'Title problems', path: '/title-problems' },
          ]}
        />
        <h1 style={{ marginTop: '1.5rem' }}>Florida title problems, explained</h1>
        <p className="lede">
          A title search turns up something. The question is always the same: what is it, does it
          stop the closing, and what does it take to clear it. These pages answer that for the
          situations we actually see on Florida files.
        </p>
        <p className="muted ui" style={{ fontSize: '0.875rem' }}>
          {all.length} page{all.length === 1 ? '' : 's'}. Each one is reviewed by a licensed Florida
          title agent and carries the date of that review.
        </p>
      </div>

      {groups.map((group) => (
        <section key={group.cluster} style={{ marginTop: '3rem' }}>
          <h2 style={{ marginTop: 0 }}>{group.label}</h2>
          <ul className="card-grid">
            {group.docs.map((doc) => (
              <li key={doc.slug} className="card">
                <h3>
                  <Link href={`/title-problems/${doc.slug}`}>{doc.title}</Link>
                </h3>
                <p>{metaDescription(doc.summary ?? doc.direct_answer, 170)}</p>
                {doc.status === 'draft' ? (
                  <p className="card__meta">Unreviewed draft — preview only</p>
                ) : doc.verifyFlags.length > 0 ? (
                  <p className="card__meta">
                    {doc.verifyFlags.length} item{doc.verifyFlags.length === 1 ? '' : 's'} awaiting
                    review
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {groups.length === 0 ? (
        <p className="measure muted">No pages are published yet.</p>
      ) : null}
    </div>
  );
}
