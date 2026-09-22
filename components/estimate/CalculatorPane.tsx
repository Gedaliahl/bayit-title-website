'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { FORM, RESULT, type EstimateMode } from '@/content/estimate';
import { estimateFromAssessedValue, otherRateLabel, type Purpose } from '@/lib/assessed-estimate';
import { DEFAULTS as CLOSING_DEFAULTS, estimate, type EstimateGroup } from '@/lib/closing-estimate';
import { addressKey } from '@/lib/address-format';
import type { ParcelValue, PropertySuggestion } from '@/lib/property-lookup';
import { discretionarySurtax, formatMoney } from '@/lib/statutory-rates';
import { FigureCard } from './FigureCard';

export interface EstimatorCounty {
  slug: string;
  name: string;
  propertyAppraiserUrl: string | null;
}

/** Chosen when the address is somewhere the list has no row for. */
const ELSEWHERE = 'elsewhere';

/** Long enough to be a house number and part of a street. */
const MIN_QUERY_LENGTH = 5;

/** Long enough that somebody has stopped typing, short enough not to feel like waiting. */
const DEBOUNCE_MS = 300;

/** Where the figure in the assessed value box came from. */
type ValueOrigin = 'typed' | 'assessed' | 'just';

function parseAmount(raw: string): number {
  const digits = raw.replace(/[^\d]/g, '');
  return digits === '' ? 0 : Number(digits);
}

function displayAmount(value: number): string {
  return value === 0 ? '' : value.toLocaleString('en-US');
}

function parsePages(raw: string): number {
  return Math.min(500, parseAmount(raw));
}

/** "1409 NW 48th St, Boca Raton 33431" — what the box says once a suggestion is taken. */
function suggestionLine(suggestion: PropertySuggestion): string {
  return [suggestion.address, [suggestion.city, suggestion.zip].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
}

function premiumSubtotal(groups: EstimateGroup[]): number | null {
  const premium = groups.find((group) => group.title === 'Title insurance premium');
  return premium ? premium.subtotal : null;
}

/** A labelled box with a `$` in front, formatted with thousands separators as it is typed. */
function MoneyField({
  id,
  label,
  hint,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  value: number;
  onChange: (value: number) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint ? (
        <span className="field__hint" id={`${id}-hint`} aria-live="polite">
          {hint}
        </span>
      ) : null}
      <div className="money">
        <span className="money__prefix" aria-hidden="true">
          $
        </span>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          aria-describedby={hint ? `${id}-hint` : undefined}
          value={displayAmount(value)}
          onChange={(event) => onChange(parseAmount(event.target.value))}
        />
      </div>
      {children}
    </div>
  );
}

/**
 * The first two ways in, which share one form. Option 1 starts from an
 * address and prices off the roll's assessed value; option 2 starts from the
 * contract numbers. Everything typed in one is still there in the other, which
 * is why both modes are one component with the mode as a prop.
 */
export function CalculatorPane({
  mode,
  hidden,
  counties,
  valueCountySlugs,
}: {
  mode: Exclude<EstimateMode, 'upload'>;
  hidden: boolean;
  counties: EstimatorCounty[];
  /** Counties where picking a property produces a figure rather than an errand. */
  valueCountySlugs: string[];
}) {
  const isAddress = mode === 'address';

  const [purpose, setPurpose] = useState<Purpose>('purchase');
  // Null until the reader chooses one; before that the parcel, or the default.
  const [chosenCounty, setChosenCounty] = useState<string | null>(null);
  const [assessed, setAssessed] = useState(0);
  const [addressLoan, setAddressLoan] = useState(0);
  const [price, setPrice] = useState(CLOSING_DEFAULTS.price);
  const [numbersLoan, setNumbersLoan] = useState(CLOSING_DEFAULTS.loanAmount);
  const [reissue, setReissue] = useState(false);
  const [prior, setPrior] = useState(0);
  const [singleFamily, setSingleFamily] = useState(true);
  const [deedPages, setDeedPages] = useState(CLOSING_DEFAULTS.deedPages);
  const [mortgagePages, setMortgagePages] = useState(CLOSING_DEFAULTS.mortgagePages);
  const [pagesOpen, setPagesOpen] = useState(false);

  // The address search. What came back is kept with the query it came back
  // for, so a stale answer can never be shown against a newer box.
  const [address, setAddress] = useState('');
  const [answer, setAnswer] = useState<{ query: string; items: PropertySuggestion[] } | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searching, setSearching] = useState(false);
  /** The suggestion the figures are standing on, if any. */
  const [parcel, setParcel] = useState<PropertySuggestion | null>(null);
  /** Where the figure in the box came from, once it is the appraiser's. */
  const [record, setRecord] = useState<ParcelValue | null>(null);
  const [valueOrigin, setValueOrigin] = useState<ValueOrigin>('typed');
  /** Counties that publish addresses but not values need a second request. */
  const [lookingUp, setLookingUp] = useState(false);
  /** 'declined' — the roll says that is not the parcel; 'unavailable' — it did not answer. */
  const [valueMissed, setValueMissed] = useState<'declined' | 'unavailable' | null>(null);

  // Taking a suggestion rewrites the box, which would otherwise look exactly
  // like typing and send the rewritten address straight back to the server.
  const skipNextSearch = useRef(false);
  const listId = useId();

  const query = address.trim();
  const searchable = query.length >= MIN_QUERY_LENGTH && /\d/.test(query);
  const suggestions = answer?.query === query ? answer.items : [];
  const foundNothing = answer?.query === query && answer.items.length === 0;
  const listOpen = isAddress && open && suggestions.length > 0;

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
        // A POST, so the address never sits in a request line or a log.
        const response = await fetch('/api/property-search', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ q: query }),
          signal: controller.signal,
        });
        const payload = response.ok ? await response.json() : { suggestions: [] };
        setAnswer({ query, items: Array.isArray(payload.suggestions) ? payload.suggestions : [] });
        setActiveIndex(-1);
        setOpen(true);
      } catch {
        // Usually the next keystroke aborting this one. A request that truly
        // failed leaves the box as usable as it was before any of this existed.
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

  function countyInList(slug: string | null): string {
    return slug && counties.some((entry) => entry.slug === slug) ? slug : ELSEWHERE;
  }

  /** Puts a roll figure in the box and remembers whose it is. */
  function applyValue(value: ParcelValue) {
    setRecord(value);
    if (value.assessedValue) {
      setAssessed(value.assessedValue);
      setValueOrigin('assessed');
    } else if (value.justValue) {
      setAssessed(value.justValue);
      setValueOrigin('just');
    } else {
      setValueOrigin('typed');
    }
  }

  async function lookUpValue(suggestion: PropertySuggestion) {
    setLookingUp(true);
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
      const payload = response.ok ? await response.json() : { value: null, unavailable: true };

      if (payload.value) {
        const value = payload.value as ParcelValue;
        // A statewide geocoder's suggestion has no county until the roll names one.
        if (value.countySlug && value.countySlug !== suggestion.countySlug) {
          setChosenCounty(countyInList(value.countySlug));
        }
        applyValue(value);
      } else {
        setValueMissed(payload.unavailable ? 'unavailable' : 'declined');
      }
    } catch {
      setValueMissed('unavailable');
    } finally {
      setLookingUp(false);
    }
  }

  function takeSuggestion(suggestion: PropertySuggestion) {
    skipNextSearch.current = true;
    setAddress(suggestionLine(suggestion));
    setOpen(false);
    setActiveIndex(-1);
    setSearching(false);
    setParcel(suggestion);
    setValueMissed(null);
    setChosenCounty(countyInList(suggestion.countySlug));

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
    if (suggestion.valueLookup) void lookUpValue(suggestion);
  }

  function onAddressKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!listOpen) {
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

  const defaultCounty = counties.some((entry) => entry.slug === 'broward-county')
    ? 'broward-county'
    : (counties[0]?.slug ?? ELSEWHERE);
  const countySlug = chosenCounty ?? defaultCounty;
  const county = counties.find((entry) => entry.slug === countySlug) ?? null;
  const countyName = county?.name ?? RESULT.outsideDade;

  const isPurchase = purpose === 'purchase';
  const loan = isAddress ? addressLoan : numbersLoan;

  const result = useMemo(() => {
    if (isAddress) {
      const assessedResult = estimateFromAssessedValue({
        purpose,
        countySlug,
        assessedValue: assessed,
        loanAmount: addressLoan,
        reissue,
        priorPolicyAmount: prior,
        singleFamilyResidence: singleFamily,
      });
      return {
        groups: assessedResult.groups,
        total: assessedResult.total,
        premiumTotal: assessedResult.premiumTotal,
        alternate: assessedResult.alternateRateTotal,
      };
    }

    const input = {
      transaction: purpose,
      countySlug,
      price,
      loanAmount: numbersLoan,
      reissue,
      priorPolicyAmount: prior,
      singleFamilyResidence: singleFamily,
      deedPages,
      mortgagePages,
    };
    const priced = estimate(input);
    const premiumTotal = premiumSubtotal(priced.groups);
    // The same coverage at the other schedule, so the reader can see what
    // finding the old policy is worth.
    const other = premiumSubtotal(estimate({ ...input, reissue: !reissue }).groups);
    return {
      groups: priced.groups,
      total: priced.total,
      premiumTotal: premiumTotal ?? 0,
      alternate: premiumTotal === null ? null : other,
    };
  }, [
    isAddress,
    purpose,
    countySlug,
    assessed,
    addressLoan,
    price,
    numbersLoan,
    reissue,
    prior,
    singleFamily,
    deedPages,
    mortgagePages,
  ]);

  const hasResult = result.groups.length > 0;
  const surtaxApplies = isPurchase && discretionarySurtax(countySlug) !== null;
  const valueCounty = valueCountySlugs.includes(countySlug);
  /** The roll's figures belong to the roll, not to a number typed over them. */
  const showingRoll = record !== null && valueOrigin !== 'typed';

  const assessedHint = lookingUp ? (
    FORM.assessed.reading
  ) : showingRoll && record ? (
    <>
      {valueOrigin === 'assessed' ? FORM.assessed.onRoll.assessed : FORM.assessed.onRoll.just}
      {FORM.assessed.onRoll.onThe(record.rollYear)}
      {FORM.assessed.onRoll.fromThe}
      <a href={record.sourceUrl} rel="nofollow noopener" target="_blank">
        {record.sourceName}
      </a>
      {FORM.assessed.onRoll.parcel(record.parcelId)}.
      {/* A corner lot is filed by the county under one street and by the
          state under the other, so the roll's own spelling is shown. */}
      {addressKey(record.address) !== addressKey(parcel?.address ?? record.address)
        ? FORM.assessed.onRoll.filedAs(record.address)
        : ''}
    </>
  ) : county?.propertyAppraiserUrl ? (
    <>
      {valueMissed === 'unavailable'
        ? FORM.assessed.unavailable
        : valueMissed === 'declined'
          ? FORM.assessed.declined
          : valueCounty
            ? FORM.assessed.pickOr
            : FORM.assessed.lookUp}
      <a href={county.propertyAppraiserUrl} rel="nofollow noopener" target="_blank">
        {FORM.assessed.appraiser(county.name)}
      </a>
      {FORM.assessed.copyAcross}
    </>
  ) : (
    FORM.assessed.anyCounty
  );

  const showAltValue =
    isAddress &&
    isPurchase &&
    !!record?.justValue &&
    !!record?.assessedValue &&
    record.justValue !== record.assessedValue;

  const alternateText =
    hasResult && result.alternate !== null && result.alternate !== result.premiumTotal
      ? RESULT.alternate(otherRateLabel(reissue), formatMoney(result.alternate), formatMoney(result.premiumTotal))
      : null;

  return (
    <div className="calc-grid" hidden={hidden}>
      <form
        className="form-card"
        // Nothing is submitted and nothing is stored. The address is used to
        // ask a county roll about a parcel and is gone when the answer comes.
        onSubmit={(event) => event.preventDefault()}
      >
        {isAddress ? (
          <div className="field combo">
            <label htmlFor="address">{FORM.address.label}</label>
            <span className="field__hint" id="address-hint">
              {FORM.address.hint}
            </span>
            <input
              id="address"
              autoComplete="off"
              role="combobox"
              aria-expanded={listOpen}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-describedby="address-hint"
              aria-activedescendant={activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
              placeholder={FORM.address.placeholder}
              value={address}
              onChange={(event) => {
                setAddress(event.target.value);
                // A new address means the figure below is no longer this
                // property's. The number stays; it stops claiming to be the roll's.
                if (parcel || record) {
                  setParcel(null);
                  setRecord(null);
                  setValueOrigin('typed');
                  setValueMissed(null);
                }
              }}
              onKeyDown={onAddressKeyDown}
              onFocus={() => suggestions.length > 0 && setOpen(true)}
              onBlur={() => setOpen(false)}
            />

            {listOpen ? (
              <ul className="combo__list" id={listId} role="listbox" aria-label={FORM.address.listLabel}>
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
                    <span className="combo__value">
                      {suggestion.assessedValue
                        ? `Assessed ${formatMoney(suggestion.assessedValue)}`
                        : suggestion.justValue
                          ? `Just value ${formatMoney(suggestion.justValue)}`
                          : suggestion.valueLookup
                            ? FORM.address.valueOnPick
                            : FORM.address.noRoll}
                    </span>
                    <span className="combo__meta">
                      {[suggestion.city, suggestion.zip, suggestion.countyName].filter(Boolean).join(' · ')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            <span className="field__hint combo__status" aria-live="polite">
              {searching ? FORM.address.looking : foundNothing ? FORM.address.nothing : ''}
            </span>
          </div>
        ) : null}

        <div className="field">
          <span className="field__label" id={`${listId}-transaction`}>
            {FORM.transaction.label}
          </span>
          <div className="seg" role="radiogroup" aria-labelledby={`${listId}-transaction`}>
            {(
              [
                ['purchase', FORM.transaction.purchase],
                ['refinance', FORM.transaction.refinance],
              ] as [Purpose, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={purpose === value}
                onClick={() => setPurpose(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor={`${listId}-county`}>{FORM.county.label}</label>
          <span className="field__hint" id={`${listId}-county-hint`}>
            {isAddress && parcel ? FORM.county.fromParcel(parcel.countyName) : FORM.county.hint(isAddress)}
          </span>
          <select
            id={`${listId}-county`}
            aria-describedby={`${listId}-county-hint`}
            value={countySlug}
            onChange={(event) => setChosenCounty(event.target.value)}
          >
            {counties.map((entry) => (
              <option key={entry.slug} value={entry.slug}>
                {entry.name}
              </option>
            ))}
            <option value={ELSEWHERE}>{FORM.county.elsewhere}</option>
          </select>
        </div>

        {isAddress && isPurchase ? (
          <MoneyField
            id="assessed"
            label={FORM.assessed.label}
            hint={assessedHint}
            value={assessed}
            onChange={(value) => {
              setAssessed(value);
              setValueOrigin('typed');
            }}
          >
            {showAltValue && record ? (
              <span className="field__hint">
                {valueOrigin === 'just'
                  ? FORM.assessed.assessedIs(formatMoney(record.assessedValue ?? 0))
                  : FORM.assessed.justAlso(formatMoney(record.justValue ?? 0))}{' '}
                <button
                  type="button"
                  className="linkish"
                  onClick={() => {
                    if (valueOrigin === 'just') {
                      setAssessed(record.assessedValue ?? 0);
                      setValueOrigin('assessed');
                    } else {
                      setAssessed(record.justValue ?? 0);
                      setValueOrigin('just');
                    }
                  }}
                >
                  {FORM.assessed.useInstead}
                </button>
              </span>
            ) : null}
          </MoneyField>
        ) : null}

        {!isAddress && isPurchase ? (
          <MoneyField id="price" label={FORM.price.label} hint={FORM.price.hint} value={price} onChange={setPrice} />
        ) : null}

        <MoneyField
          id={isAddress ? 'address-loan' : 'loan'}
          label={FORM.loan.label}
          hint={isPurchase ? FORM.loan.purchaseHint : FORM.loan.refinanceHint}
          value={loan}
          onChange={isAddress ? setAddressLoan : setNumbersLoan}
        />

        <label className="check">
          <input type="checkbox" checked={reissue} onChange={(event) => setReissue(event.target.checked)} />
          <span>
            <strong>{FORM.reissue.label}</strong>{' '}
            <span className="check__sub">
              {FORM.reissue.sub} <a href="#reissue">{FORM.reissue.link}</a>
            </span>
          </span>
        </label>

        {reissue ? (
          <div className="indent">
            <MoneyField id="prior" label={FORM.prior.label} hint={FORM.prior.hint} value={prior} onChange={setPrior} />
          </div>
        ) : null}

        {surtaxApplies ? (
          <label className="check">
            <input
              type="checkbox"
              checked={singleFamily}
              onChange={(event) => setSingleFamily(event.target.checked)}
            />
            <span>
              <strong>{FORM.singleFamily.label}</strong>{' '}
              <span className="check__sub">{FORM.singleFamily.sub}</span>
            </span>
          </label>
        ) : null}

        {!isAddress ? (
          <div className="disclosure">
            <button
              type="button"
              className="disclosure__toggle"
              aria-expanded={pagesOpen}
              aria-controls={`${listId}-pages`}
              onClick={() => setPagesOpen((current) => !current)}
            >
              <span>{FORM.pages.label}</span>
              <span className="disclosure__plus" aria-hidden="true">
                +
              </span>
            </button>
            {pagesOpen ? (
              <div className="disclosure__body" id={`${listId}-pages`}>
                <span className="field__hint">{FORM.pages.hint}</span>
                <div className="two-up">
                  {isPurchase ? (
                    <div className="field">
                      <label htmlFor="deed-pages">{FORM.pages.deed}</label>
                      <input
                        id="deed-pages"
                        inputMode="numeric"
                        value={deedPages === 0 ? '' : String(deedPages)}
                        onChange={(event) => setDeedPages(parsePages(event.target.value))}
                      />
                    </div>
                  ) : null}
                  <div className="field">
                    <label htmlFor="mortgage-pages">{FORM.pages.mortgage}</label>
                    <input
                      id="mortgage-pages"
                      inputMode="numeric"
                      value={mortgagePages === 0 ? '' : String(mortgagePages)}
                      onChange={(event) => setMortgagePages(parsePages(event.target.value))}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </form>

      <FigureCard
        eyebrow={RESULT.eyebrow[mode]}
        total={hasResult ? formatMoney(result.total) : '—'}
        sub={
          hasResult
            ? RESULT.sub(isPurchase, countyName, isAddress && showingRoll ? (record?.rollYear ?? null) : null)
            : RESULT.nothingYet
        }
        groups={result.groups}
        totalLabel={RESULT.totalLabel[mode]}
        alternateText={alternateText}
        unknownsText={RESULT.unknowns[mode]}
        emptyText={
          isAddress
            ? isPurchase
              ? RESULT.empty.addressPurchase
              : RESULT.empty.addressRefinance
            : RESULT.empty.numbers
        }
      />
    </div>
  );
}
