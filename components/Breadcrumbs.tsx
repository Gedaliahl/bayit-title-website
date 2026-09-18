import Link from 'next/link';
import { BreadcrumbSchema } from './Schema';

export function Breadcrumbs({ trail }: { trail: { name: string; path: string }[] }) {
  return (
    <>
      <BreadcrumbSchema trail={trail} />
      <nav aria-label="Breadcrumb" className="crumbs">
        <ol>
          {trail.map((crumb, index) => (
            <li key={crumb.path}>
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {index === trail.length - 1 ? (
                <span aria-current="page">{crumb.name}</span>
              ) : (
                <Link href={crumb.path}>{crumb.name}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
