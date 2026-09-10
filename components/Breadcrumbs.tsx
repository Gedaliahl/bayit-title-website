import Link from 'next/link';
import { BreadcrumbSchema } from './Schema';

export function Breadcrumbs({ trail }: { trail: { name: string; path: string }[] }) {
  return (
    <>
      <BreadcrumbSchema trail={trail} />
      <nav aria-label="Breadcrumb" className="ui muted" style={{ fontSize: '0.8125rem' }}>
        <ol style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', listStyle: 'none', padding: 0, margin: 0 }}>
          {trail.map((crumb, index) => (
            <li key={crumb.path} style={{ display: 'flex', gap: '0.4rem' }}>
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {index === trail.length - 1 ? (
                <span aria-current="page">{crumb.name}</span>
              ) : (
                <Link href={crumb.path} style={{ color: 'inherit' }}>
                  {crumb.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
