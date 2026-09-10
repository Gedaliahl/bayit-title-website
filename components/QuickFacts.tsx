export interface QuickFact {
  term: string;
  detail: string;
}

/** The quick-facts box that sits under the answer panel on every library page. */
export function QuickFacts({ facts }: { facts: QuickFact[] }) {
  if (facts.length === 0) return null;

  return (
    <div className="quick-facts">
      <dl>
        {facts.map((fact) => (
          <div key={fact.term} style={{ display: 'contents' }}>
            <dt>{fact.term}</dt>
            <dd>{fact.detail}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
