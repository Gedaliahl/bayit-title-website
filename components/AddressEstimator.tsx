'use client';

import { useMemo, useState } from 'react';

import {
  ASSESSED_DEFAULTS,
  ASSESSED_UNKNOWNS,
  estimateFromAssessedValue,
  otherRateLabel,
  type AssessedInput,
  type Purpose,
} from '@/lib/assessed-estimate';
import { matchCounty } from '@/lib/florida-places';
import { formatMoney } from '@/lib/statutory-rates';

export interface EstimatorCounty {
  slug: string;
  name: string;
  propertyAppraiserUrl: string | null;
  customaryOwnerPolicyPayer: string | null;
}

/** Chosen when the address is somewhere we have no appraiser link for. */
const ELSEWHERE = 'elsewhere';

function parseAmount(raw: string): number {
  const digits = raw.replace(/[^\d]/g, '');
  return digits === '' ? 0 : Number(digits);
}

function displayAmount(value: number): string {
  return value === 0 ? '' : value.toLocaleString('en-US');
}

export function AddressEstimator({ counties }: { counties: EstimatorCounty[] }) {
  const [address, setAddress] = useState('');
  const [input, setInput] = useState<AssessedInput>(ASSESSED_DEFAULTS);
  // Null until the reader chooses one themselves; before that the suggestion
  // from the address is what is selected.
  const [chosenCounty, setChosenCounty] = useState<string | null>(null);

  const suggestion = useMemo(() => matchCounty(address), [address]);

  const countySlug =
    chosenCounty ?? (suggestion && counties.some((c) => c.slug === suggestion.countySlug)
      ? suggestion.countySlug
      : ELSEWHERE);

  const county = counties.find((entry) => entry.slug === countySlug) ?? null;

  const set = <K extends keyof AssessedInput>(key: K, value: AssessedInput[K]) =>
    setInput((current) => ({ ...current, [key]: value }));

  const result = useMemo(() => estimateFromAssessedValue(input), [input]);

  const isPurchase = input.purpose === 'purchase';

  return (
    <div className="calc">
      <form
        className="calc__form"
        // Nothing is submitted and nothing is stored. The address is used in
        // this browser to guess a county and never leaves it.
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="field">
          <label htmlFor="address">Property address</label>
          <span className="field__hint" id="address-hint">
            Street and city is enough. It stays in your browser — nothing is sent to us.
          </span>
          <input
            id="address"
            autoComplete="off"
            aria-describedby="address-hint"
            placeholder="123 Example Street, Coral Springs"
            value={address}
            onChange={(event) => {
              setAddress(event.target.value);
              // A new address means a new guess; a county the reader picked by
              // hand is left alone.
            }}
          />
        </div>

        <div className="field">
          <label htmlFor="estimator-county">County</label>
          <span className="field__hint" id="estimator-county-hint">
            {suggestion && chosenCounty === null
              ? `Read from “${suggestion.place}” in the address above. Change it if that is wrong.`
              : 'Where the property is. The premium is the same statewide; the county decides where you read the assessed value.'}
          </span>
          <select
            id="estimator-county"
            aria-describedby="estimator-county-hint"
            value={countySlug}
            onChange={(event) => setChosenCounty(event.target.value)}
          >
            {counties.map((entry) => (
              <option key={entry.slug} value={entry.slug}>
                {entry.name}
              </option>
            ))}
            <option value={ELSEWHERE}>Another Florida county</option>
          </select>
        </div>

        <fieldset className="calc__fieldset">
          <legend>What is the transaction?</legend>
          {(
            [
              ['purchase', 'A purchase'],
              ['refinance', 'A refinance'],
            ] as [Purpose, string][]
          ).map(([value, label]) => (
            <label className="calc__radio" key={value}>
              <input
                type="radio"
                name="purpose"
                value={value}
                checked={input.purpose === value}
                onChange={() => set('purpose', value)}
              />
              {label}
            </label>
          ))}
        </fieldset>

        {isPurchase ? (
          <div className="field">
            <label htmlFor="assessed">Assessed value</label>
            <span className="field__hint" id="assessed-hint">
              {county?.propertyAppraiserUrl ? (
                <>
                  Look the parcel up on the{' '}
                  <a href={county.propertyAppraiserUrl} rel="nofollow noopener" target="_blank">
                    {county.name} Property Appraiser
                  </a>{' '}
                  and copy the assessed or just value across.
                </>
              ) : (
                'From that county’s property appraiser record for the parcel. Every Florida county publishes one.'
              )}
            </span>
            <input
              id="assessed"
              inputMode="numeric"
              aria-describedby="assessed-hint"
              value={displayAmount(input.assessedValue)}
              onChange={(event) => set('assessedValue', parseAmount(event.target.value))}
            />
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="estimator-loan">Loan amount</label>
          <span className="field__hint" id="estimator-loan-hint">
            {isPurchase ? 'Leave empty for a cash closing.' : 'The new loan.'}
          </span>
          <input
            id="estimator-loan"
            inputMode="numeric"
            aria-describedby="estimator-loan-hint"
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
            <span className="field__hint"> — the owner or seller was insured within three years</span>
          </span>
        </label>
      </form>

      <div className="calc__result" aria-live="polite">
        {result.lines.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            {isPurchase
              ? 'Enter the assessed value and the figures appear here.'
              : 'Enter the loan amount and the figures appear here.'}
          </p>
        ) : (
          <>
            <section className="estimate-group">
              <h3>Title insurance premium</h3>
              {result.lines.map((line) => (
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

            <div className="estimate-total">
              <div>Promulgated premium</div>
              <div className="estimate-line__amount">{formatMoney(result.total)}</div>
            </div>

            {result.alternateRateTotal !== null &&
            result.alternateRateTotal !== result.total ? (
              <p className="estimate-caveat">
                At the {otherRateLabel(input.reissue)} the same coverage is{' '}
                <strong>{formatMoney(result.alternateRateTotal)}</strong>. The difference is what it
                is worth finding the old policy for.
              </p>
            ) : null}

            {county?.customaryOwnerPolicyPayer ? (
              <p className="estimate-caveat">
                Custom in {county.name} is that the{' '}
                <strong>{county.customaryOwnerPolicyPayer}</strong> pays for the owner&rsquo;s
                policy. The contract decides it, not the custom.
              </p>
            ) : null}

            <p className="estimate-caveat">
              This is the promulgated premium on that amount of coverage and nothing else. Not in
              it:
            </p>
            <ul className="estimate-caveat">
              {ASSESSED_UNKNOWNS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
