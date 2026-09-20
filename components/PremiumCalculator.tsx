'use client';

import { useMemo, useState } from 'react';

import {
  DEFAULTS,
  REISSUE_CONDITIONS,
  UNPRICED,
  estimate,
  type EstimateInput,
  type Transaction,
} from '@/lib/closing-estimate';
import { formatMoney } from '@/lib/statutory-rates';

/** Whole dollars in, so a stray comma or dollar sign in a paste does no harm. */
function parseAmount(raw: string): number {
  const digits = raw.replace(/[^\d]/g, '');
  return digits === '' ? 0 : Number(digits);
}

function displayAmount(value: number): string {
  return value === 0 ? '' : value.toLocaleString('en-US');
}

function parsePages(raw: string): number {
  const digits = raw.replace(/[^\d]/g, '');
  return digits === '' ? 0 : Math.min(500, Number(digits));
}

export function PremiumCalculator({
  counties,
  surtaxCountySlugs,
}: {
  counties: { slug: string; name: string }[];
  /** Counties where the discretionary surtax question is real — Miami-Dade. */
  surtaxCountySlugs: string[];
}) {
  const [input, setInput] = useState<EstimateInput>({
    ...DEFAULTS,
    countySlug: counties[0]?.slug ?? DEFAULTS.countySlug,
  });

  const set = <K extends keyof EstimateInput>(key: K, value: EstimateInput[K]) =>
    setInput((current) => ({ ...current, [key]: value }));

  const result = useMemo(() => estimate(input), [input]);

  const isPurchase = input.transaction === 'purchase';
  const asksAboutSurtax = isPurchase && surtaxCountySlugs.includes(input.countySlug);

  return (
    <div className="calc">
      <form
        className="calc__form"
        // Nothing is submitted: the figures are the rule's and the statutes',
        // so the arithmetic happens here and no one has to hand over a name to
        // see it.
        onSubmit={(event) => event.preventDefault()}
      >
        <fieldset className="calc__fieldset">
          <legend>What is the transaction?</legend>
          {(
            [
              ['purchase', 'A purchase'],
              ['refinance', 'A refinance'],
            ] as [Transaction, string][]
          ).map(([value, label]) => (
            <label className="calc__radio" key={value}>
              <input
                type="radio"
                name="transaction"
                value={value}
                checked={input.transaction === value}
                onChange={() => set('transaction', value)}
              />
              {label}
            </label>
          ))}
        </fieldset>

        <div className="field">
          <label htmlFor="county">County</label>
          <select
            id="county"
            value={input.countySlug}
            onChange={(event) => set('countySlug', event.target.value)}
          >
            {counties.map((county) => (
              <option key={county.slug} value={county.slug}>
                {county.name}
              </option>
            ))}
          </select>
        </div>

        {isPurchase ? (
          <div className="field">
            <label htmlFor="price">Purchase price</label>
            <span className="field__hint" id="price-hint">
              The owner&rsquo;s policy is written for the full insurable value.
            </span>
            <input
              id="price"
              inputMode="numeric"
              aria-describedby="price-hint"
              value={displayAmount(input.price)}
              onChange={(event) => set('price', parseAmount(event.target.value))}
            />
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="loan">Loan amount</label>
          <span className="field__hint" id="loan-hint">
            {isPurchase ? 'Leave empty for a cash closing.' : 'The new loan.'}
          </span>
          <input
            id="loan"
            inputMode="numeric"
            aria-describedby="loan-hint"
            value={displayAmount(input.loanAmount)}
            onChange={(event) => set('loanAmount', parseAmount(event.target.value))}
          />
        </div>

        <label className="calc__check">
          <input
            type="checkbox"
            checked={input.reissue}
            onChange={(event) => set('reissue', event.target.checked)}
          />
          <span>
            The reissue rate applies
            <span className="field__hint"> — see the conditions below</span>
          </span>
        </label>

        {input.reissue ? (
          <div className="field">
            <label htmlFor="prior-policy">What the previous policy insured</label>
            <span className="field__hint" id="prior-policy-hint">
              The face amount of the old owner&rsquo;s policy. The reissue rate reaches that far;
              anything above it is at the original rate. Leave it empty if you do not have the
              policy to hand and the figure will read low.
            </span>
            <input
              id="prior-policy"
              inputMode="numeric"
              aria-describedby="prior-policy-hint"
              value={displayAmount(input.priorPolicyAmount)}
              onChange={(event) => set('priorPolicyAmount', parseAmount(event.target.value))}
            />
          </div>
        ) : null}

        {asksAboutSurtax ? (
          <label className="calc__check">
            <input
              type="checkbox"
              checked={input.singleFamilyResidence}
              onChange={(event) => set('singleFamilyResidence', event.target.checked)}
            />
            <span>
              What is being conveyed is only a single-family residence
              <span className="field__hint"> — if not, the county surtax is charged</span>
            </span>
          </label>
        ) : null}

        <details className="calc__details">
          <summary>Page counts</summary>
          <p className="field__hint">
            Recording is charged by the page. These are ordinary lengths; change them if you know
            the documents.
          </p>
          <div className="field-row">
            {isPurchase ? (
              <div className="field">
                <label htmlFor="deed-pages">Pages in the deed</label>
                <input
                  id="deed-pages"
                  inputMode="numeric"
                  value={input.deedPages === 0 ? '' : String(input.deedPages)}
                  onChange={(event) => set('deedPages', parsePages(event.target.value))}
                />
              </div>
            ) : null}
            <div className="field">
              <label htmlFor="mortgage-pages">Pages in the mortgage</label>
              <input
                id="mortgage-pages"
                inputMode="numeric"
                value={input.mortgagePages === 0 ? '' : String(input.mortgagePages)}
                onChange={(event) => set('mortgagePages', parsePages(event.target.value))}
              />
            </div>
          </div>
        </details>
      </form>

      <div className="calc__result" aria-live="polite">
        {result.groups.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Enter a price or a loan amount and the figures appear here.
          </p>
        ) : (
          <>
            {result.groups.map((group) => (
              <section className="estimate-group" key={group.title}>
                <h3>{group.title}</h3>
                {group.lines.map((line) => (
                  <div className="estimate-line" key={line.label}>
                    <div>
                      {line.label}
                      {line.note ? <span className="estimate-line__note">{line.note}</span> : null}
                      <a className="estimate-line__cite" href={line.sourceUrl} rel="nofollow">
                        {line.cite}
                      </a>
                    </div>
                    <div className="estimate-line__amount">{formatMoney(line.value)}</div>
                  </div>
                ))}
              </section>
            ))}

            <div className="estimate-total">
              <div>Set by rule and statute</div>
              <div className="estimate-line__amount">{formatMoney(result.total)}</div>
            </div>

            <p className="estimate-caveat">
              That is every figure on this closing somebody other than us sets. It is not the whole
              closing statement and it is not a quote. Not counted here:
            </p>
            <ul className="estimate-caveat">
              {UNPRICED.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="calc__footnote">
        <h3>When does the reissue rate apply?</h3>
        <ul>
          {REISSUE_CONDITIONS.map((condition) => (
            <li key={condition}>{condition}</li>
          ))}
        </ul>
        <p className="muted">
          If you are not sure whether it applies to your file, tick it and untick it — the
          difference is what it is worth finding the old policy for. Then ask us and we will check.
        </p>
      </div>
    </div>
  );
}
