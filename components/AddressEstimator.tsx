'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

import {
  ASSESSED_DEFAULTS,
  ASSESSED_UNKNOWNS,
  estimateFromAssessedValue,
  otherRateLabel,
  type AssessedInput,
  type Purpose,
} from '@/lib/assessed-estimate';
import { addressKey } from '@/lib/address-format';
import { matchCounty } from '@/lib/florida-places';
import type { ParcelValue, PropertySuggestion } from '@/lib/property-lookup';
import { discretionarySurtax, formatMoney } from '@/lib/statutory-rates';

export interface EstimatorCounty {
  slug: string;
  name: string;
  propertyAppraiserUrl: string | null;
  customaryOwnerPolicyPayer: string | null;
}

/** Chosen when the address is somewhere we have no appraiser link for. */
const ELSEWHERE = 'elsewhere';

/** Long enough to be a house number and part of a street. */
const MIN_QUERY_LENGTH = 5;

/** Long enough that somebody has stopped typing, short enough not to feel like waiting. */
const DEBOUNCE_MS = 250;

/** Where the figure in the assessed value box came from. */
type ValueOrigin = 'typed' | 'assessed' | 'just';

function parseAmount(raw: string): number {
  const digits = raw.replace(/[^\d]/g, '');
  return digits === '' ? 0 : Number(digits);
}

function displayAmount(value: number): string {
  return value === 0 ? '' : value.toLocaleString('en-US');
}

/** "1409 NW 48th St, Boca Raton 33431" — what the box says once a suggestion is taken. */
function suggestionLine(suggestion: PropertySuggestion): string {
  return [suggestion.address, [suggestion.city, suggestion.zip].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
}

export function AddressEstimator({
  counties,
  valueCountySlugs,
}: {
  counties: EstimatorCounty[];
  /** Counties where picking a property produces a figure rather than an errand. */
  valueCountySlugs: string[];
}) {
  const [address, setAddress] = useState('');
  const [input, setInput] = useState<AssessedInput>(ASSESSED_DEFAULTS);
  // Null until the reader chooses one themselves; before that the suggestion
  // from the address is what is selected.
  const [chosenCounty, setChosenCounty] = useState<string | null>(null);

  // What came back, and what it came back for. Keeping the query alongside the
  // rows is what makes a stale answer impossible to show: the moment the box
  // says something else, these rows stop being this box's rows.
  const [answer, setAnswer] = useState<{ query: string; items: PropertySuggestion[] } | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searching, setSearching] = useState(false);
  /** The suggestion the figures below are standing on, if any. */
  const [parcel, setParcel] = useState<PropertySuggestion | null>(null);
  /** Where the figure in the box came from, once it is the appraiser's. */
  const [record, setRecord] = useState<ParcelValue | null>(null);
  const [valueOrigin, setValueOrigin] = useState<ValueOrigin>('typed');
  /** Orange and Duval need a second request before there is a figure to show. */
  const [lookingUpValue, setLookingUpValue] = useState(false);
  const [valueMissed, setValueMissed] = useState(false);

  // Taking a suggestion rewrites the address box, which would otherwise look
  // exactly like typing and send the rewritten address straight back to the
  // server for a search nobody asked for.
  const skipNextSearch = useRef(false);
  const listId = useId();

  const placeGuess = useMemo(() => matchCounty(address), [address]);

  const query = address.trim();
  // Every roll behind this is addressed by house number, so there is nothing to
  // ask about until one has been typed.
  const searchable = query.length >= MIN_QUERY_LENGTH && /\d/.test(query);
  const suggestions = answer?.query === query ? answer.items : [];
  const foundNothing = answer?.query === query && answer.items.length === 0;

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    if (!searchable) return;

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch('/api/property-search', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ q: query }),
          signal: controller.signal,
        });

        const payload = response.ok ? await response.json() : { suggestions: [] };
        setAnswer({
          query,
          items: Array.isArray(payload.suggestions) ? payload.suggestions : [],
        });
        setActiveIndex(-1);
        setOpen(true);
      } catch {
        // The usual case is the next keystroke aborting this one, and that
        // keystroke's own request is already on its way. A request that
        // genuinely failed leaves the box exactly as usable as it was before
        // any of this existed, which is why nothing is said about it here.
        if (!controller.signal.aborted) setAnswer({ query, items: [] });
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchable]);

  const set = <K extends keyof AssessedInput>(key: K, value: AssessedInput[K]) =>
    setInput((current) => ({ ...current, [key]: value }));

  function takeSuggestion(suggestion: PropertySuggestion) {
    skipNextSearch.current = true;
    setAddress(suggestionLine(suggestion));
    setOpen(false);
    setActiveIndex(-1);
    setSearching(false);
    setParcel(suggestion);
    setValueMissed(false);
    setChosenCounty(
      counties.some((entry) => entry.slug === suggestion.countySlug)
        ? suggestion.countySlug
        : ELSEWHERE,
    );

    if (suggestion.assessedValue || suggestion.justValue) {
      applyValue({
        address: suggestion.address,
        countySlug: suggestion.countySlug,
        countyName: suggestion.countyName,
        parcelId: suggestion.parcelId,
        assessedValue: suggestion.assessedValue,
        justValue: suggestion.justValue,
        rollYear: suggestion.rollYear,
        sourceName: suggestion.sourceName,
        sourceUrl: suggestion.sourceUrl,
      });
      return;
    }

    setRecord(null);
    setValueOrigin('typed');

    // Orange and Duval publish where their addresses are but not what they are
    // worth, so the figure is one more request away. The box stays as the
    // reader left it until it arrives.
    if (suggestion.valueLookup) void lookUpValue(suggestion);
  }

  /** Puts a roll figure in the box and remembers whose it is. */
  function applyValue(value: ParcelValue) {
    setRecord(value);

    // The assessed value is what the reader was going to go and copy across, so
    // that is what goes in the box. Where a county publishes only a market
    // value — or only an assessed one — the box takes whichever exists, and the
    // line under it says which of the two is sitting there.
    if (value.assessedValue) {
      set('assessedValue', value.assessedValue);
      setValueOrigin('assessed');
    } else if (value.justValue) {
      set('assessedValue', value.justValue);
      setValueOrigin('just');
    } else {
      setValueOrigin('typed');
    }
  }

  async function lookUpValue(suggestion: PropertySuggestion) {
    setLookingUpValue(true);
    try {
      const response = await fetch('/api/parcel-value', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          address: suggestion.address,
          countyName: suggestion.countyName,
          parcelId: suggestion.parcelId,
          lookup: suggestion.valueLookup,
        }),
      });

      const payload = response.ok ? await response.json() : { value: null };

      if (payload.value) {
        const value = payload.value as ParcelValue;
        // A suggestion from the statewide geocoder arrives without a county;
        // the roll it was priced from names one, so the selector catches up.
        if (value.countySlug && value.countySlug !== suggestion.countySlug) {
          setChosenCounty(
            counties.some((entry) => entry.slug === value.countySlug)
              ? value.countySlug
              : ELSEWHERE,
          );
        }
        applyValue(value);
      }
      // A null is the parcel layer declining to confirm that what is under
      // that point is the property that was picked. It is said out loud rather
      // than left as an empty box that looks like nothing happened.
      else setValueMissed(true);
    } catch {
      setValueMissed(true);
    } finally {
      setLookingUpValue(false);
    }
  }

  function onAddressKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (event.key === 'ArrowDown' && suggestions.length > 0) {
        setOpen(true);
        event.preventDefault();
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      takeSuggestion(suggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  // Before an address is typed there is nothing to guess from, and falling
  // through to ELSEWHERE there left the reader with no property appraiser to
  // read the assessed value off — which is the one thing this page needs them
  // to go and do when the roll cannot be read for them. So the first county
  // stands in until the address says otherwise or the reader picks one. The
  // link names the county it points at, so a wrong default is visible rather
  // than silent.
  const countySlug =
    chosenCounty ??
    (placeGuess && counties.some((entry) => entry.slug === placeGuess.countySlug)
      ? placeGuess.countySlug
      : (counties[0]?.slug ?? ELSEWHERE));

  const county = counties.find((entry) => entry.slug === countySlug) ?? null;

  // The county is derived from the address, the selector and the parcel, so it
  // is handed to the estimate here rather than mirrored into the form state —
  // the deed stamp rate on the screen is then the selected county's by
  // construction, with no chance of the two disagreeing for a render.
  const result = useMemo(
    () => estimateFromAssessedValue({ ...input, countySlug }),
    [input, countySlug],
  );

  const isPurchase = input.purpose === 'purchase';
  const surtaxApplies = discretionarySurtax(countySlug) !== null;
  const valueCounty = valueCountySlugs.includes(countySlug);
  /** The roll's figures belong to the roll, not to a number typed over them. */
  const showingRollFigure = record !== null && valueOrigin !== 'typed';

  return (
    <div className="calc">
      <form
        className="calc__form"
        // Nothing is submitted here and nothing is stored. The address is used
        // to ask a county roll about a parcel and is gone when the answer
        // comes back.
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="field">
          <label htmlFor="address">Property address</label>
          <span className="field__hint" id="address-hint">
            Start typing and pick the property. Where the roll can be read, the assessed value
            comes with it.
          </span>
          <div className="combo">
            <input
              id="address"
              autoComplete="off"
              role="combobox"
              aria-expanded={open && suggestions.length > 0}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-describedby="address-hint"
              aria-activedescendant={
                activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
              }
              placeholder="1409 NW 48th St, Boca Raton"
              value={address}
              onChange={(event) => {
                setAddress(event.target.value);
                // A new address means the figure below is no longer this
                // property's figure. The number stays — it may be the one they
                // wanted — but it stops claiming to be the appraiser's.
                if (parcel || record) {
                  setParcel(null);
                  setRecord(null);
                  setValueOrigin('typed');
                  setValueMissed(false);
                }
              }}
              onKeyDown={onAddressKeyDown}
              onFocus={() => suggestions.length > 0 && setOpen(true)}
              onBlur={() => setOpen(false)}
            />

            {open && suggestions.length > 0 ? (
              <ul className="combo__list" id={listId} role="listbox" aria-label="Matching properties">
                {suggestions.map((suggestion, index) => (
                  <li
                    key={suggestion.id}
                    id={`${listId}-option-${index}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    className={`combo__option${index === activeIndex ? ' combo__option--active' : ''}`}
                    // Mouse down rather than click: the input blurs first, and
                    // a closed list has nothing left to click on.
                    onMouseDown={(event) => {
                      event.preventDefault();
                      takeSuggestion(suggestion);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <span className="combo__address">{suggestion.address}</span>
                    <span className="combo__meta">
                      {[suggestion.city, suggestion.zip, suggestion.countyName]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    {suggestion.assessedValue || suggestion.justValue ? (
                      <span className="combo__value">
                        {suggestion.assessedValue
                          ? `Assessed ${formatMoney(suggestion.assessedValue)}`
                          : `Just value ${formatMoney(suggestion.justValue ?? 0)}`}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <span className="field__hint" aria-live="polite">
            {searching
              ? 'Looking…'
              : foundNothing
                ? 'No property found for that. Type the value in below and the figures still work.'
                : ''}
          </span>
        </div>

        <div className="field">
          <label htmlFor="estimator-county">County</label>
          <span className="field__hint" id="estimator-county-hint">
            {parcel
              ? `From the parcel you picked, in ${parcel.countyName}.`
              : placeGuess && chosenCounty === null
                ? `Read from “${placeGuess.place}” in the address above. Change it if that is wrong.`
                : 'Where the property is. It decides the documentary stamp rate on the deed and which property appraiser publishes the value.'}
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
            <span className="field__hint" id="assessed-hint" aria-live="polite">
              {lookingUpValue ? (
                'Reading the parcel off the roll…'
              ) : showingRollFigure && record ? (
                <>
                  {valueOrigin === 'assessed' ? 'Assessed value' : 'Just (market) value'}
                  {record.rollYear ? ` on the ${record.rollYear} roll` : ''}, from the{' '}
                  <a href={record.sourceUrl} rel="nofollow noopener" target="_blank">
                    {record.sourceName}
                  </a>
                  {record.parcelId ? ` · parcel ${record.parcelId}` : ''}.
                  {/* A corner lot is filed by the county under one of its
                      streets and by the state under the other, so the roll's
                      own spelling is shown rather than quietly swapped in. */}
                  {addressKey(record.address) !== addressKey(parcel?.address ?? record.address)
                    ? ` The roll files that parcel as ${record.address}.`
                    : ''}
                </>
              ) : county?.propertyAppraiserUrl ? (
                <>
                  {valueMissed
                    ? 'The roll would not confirm a parcel at that address, so this one is yours to fill in. Look it up on the '
                    : valueCounty
                      ? 'Pick the property above and this fills itself in, or look the parcel up on the '
                      : 'Look the parcel up on the '}
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
              onChange={(event) => {
                set('assessedValue', parseAmount(event.target.value));
                setValueOrigin('typed');
              }}
            />
            {record && record.justValue && record.assessedValue ? (
              <span className="field__hint">
                {valueOrigin === 'just' ? (
                  <>
                    Assessed value is {formatMoney(record.assessedValue)}.{' '}
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => {
                        set('assessedValue', record.assessedValue ?? 0);
                        setValueOrigin('assessed');
                      }}
                    >
                      Use that instead
                    </button>
                  </>
                ) : record.justValue === record.assessedValue ? null : (
                  <>
                    The appraiser also puts the just (market) value at{' '}
                    {formatMoney(record.justValue)}, which is nearer what a policy would be written
                    for.{' '}
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => {
                        set('assessedValue', record.justValue ?? 0);
                        setValueOrigin('just');
                      }}
                    >
                      Use that instead
                    </button>
                  </>
                )}
              </span>
            ) : null}
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

        {isPurchase && surtaxApplies ? (
          <label className="calc__check">
            <input
              type="checkbox"
              checked={input.singleFamilyResidence}
              onChange={(event) => set('singleFamilyResidence', event.target.checked)}
            />
            <span>
              It is a single-family residence
              <span className="field__hint">
                {' '}
                — {county?.name ?? 'this county'} charges a surtax on everything else
              </span>
            </span>
          </label>
        ) : null}
      </form>

      <div className="calc__result" aria-live="polite">
        {result.groups.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            {isPurchase
              ? 'Pick the property above, or enter the assessed value, and the figures appear here.'
              : 'Enter the loan amount and the figures appear here.'}
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
                {group.lines.length > 1 ? (
                  <div className="estimate-subtotal">
                    <div>Subtotal</div>
                    <div className="estimate-line__amount">{formatMoney(group.subtotal)}</div>
                  </div>
                ) : null}
              </section>
            ))}

            <div className="estimate-total">
              <div>
                Estimated charges
                <span className="estimate-line__note">
                  Everything above is set by the rule, the statute or the clerk — none of it is our
                  fee.
                </span>
              </div>
              <div className="estimate-line__amount">{formatMoney(result.total)}</div>
            </div>

            {result.alternateRateTotal !== null &&
            result.alternateRateTotal !== result.premiumTotal ? (
              <p className="estimate-caveat">
                At the {otherRateLabel(input.reissue)} the same coverage is{' '}
                <strong>{formatMoney(result.alternateRateTotal)}</strong> in premium against{' '}
                {formatMoney(result.premiumTotal)}. The difference is what it is worth finding the
                old policy for.
              </p>
            ) : null}

            {county?.customaryOwnerPolicyPayer ? (
              <p className="estimate-caveat">
                Custom in {county.name} is that the{' '}
                <strong>{county.customaryOwnerPolicyPayer}</strong> pays for the owner&rsquo;s
                policy. The contract decides it, not the custom.
              </p>
            ) : null}

            <p className="estimate-caveat">What is not in it:</p>
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
