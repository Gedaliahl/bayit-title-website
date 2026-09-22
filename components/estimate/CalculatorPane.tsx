'use client';

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { ACTIONS, FORM, RESULT, type EstimateMode } from '@/content/estimate';
import { estimateFromAssessedValue, otherRateLabel, type Purpose } from '@/lib/assessed-estimate';
import {
  DEFAULTS as CLOSING_DEFAULTS,
  estimate,
  pagesToPrice,
  type EstimateGroup,
} from '@/lib/closing-estimate';
import { PARTIES, type Party } from '@/lib/cost-allocation';
import { addressKey } from '@/lib/address-format';
import {
  caretAfterFormat,
  clearNumbers,
  formatAmount,
  formatDraft,
  parseMoney,
  parsePageCount,
  readNumbers,
  summaryText,
  writeNumbers,
  type Refusal,
} from '@/lib/estimate-input';
import type { ParcelValue, PropertySuggestion } from '@/lib/property-lookup';
import { discretionarySurtax, formatCents, formatMoney } from '@/lib/statutory-rates';
import { FigureCard } from './FigureCard';
import { TotalBar } from './TotalBar';

export interface EstimatorCounty {
  slug: string;
  name: string;
  propertyAppraiserUrl: string | null;
  /**
   * Who customarily pays for the owner's policy here, off the locations table.
   * Null where nobody has verified it, which the estimate says on the line
   * rather than guessing a side.
   */
  customaryOwnerPolicyPayer: string | null;
}

/** Chosen when the address is somewhere the list has no row for. */
const ELSEWHERE = 'elsewhere';

/** Long enough to be a house number and part of a street. */
const MIN_QUERY_LENGTH = 5;

/** Long enough that somebody has stopped typing, short enough not to feel like waiting. */
const DEBOUNCE_MS = 300;

/** Where the figure in the assessed value box came from. */
type ValueOrigin = 'typed' | 'assessed' | 'just';

/** Long enough to be a pause in typing, so the address bar is not rewritten on every key. */
const QUERY_WRITE_MS = 400;

/** Where the figures go on paste when the page cannot write to the clipboard itself. */
function copyByHand(text: string): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
  }
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

/**
 * Keeps the caret where the reader left it when a box reformats itself. Set
 * during the change, applied once React has written the new text.
 */
function useCaret() {
  const input = useRef<HTMLInputElement>(null);
  const pending = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (pending.current === null || !input.current) return;
    if (document.activeElement === input.current) {
      input.current.setSelectionRange(pending.current, pending.current);
    }
    pending.current = null;
  });

  return { input, placeAt: (position: number) => (pending.current = position) };
}

/**
 * A labelled box with a `$` in front, formatted with thousands separators as it
 * is typed. What it holds is whole dollars: a point typed into it is kept on
 * screen while the reader is in the box, and its cents are dropped rather than
 * read as more dollars. Anything it refuses leaves the last good figure in
 * place and says why underneath.
 */
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
  // Null whenever the reader is not in the box, which then shows the figure itself.
  const [draft, setDraft] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const { input, placeAt } = useCaret();
  const shown = draft ?? formatAmount(value);
  const describedBy = [hint ? `${id}-hint` : null, `${id}-error`].filter(Boolean).join(' ');

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
          ref={input}
          id={id}
          inputMode="decimal"
          autoComplete="off"
          aria-describedby={describedBy}
          value={shown}
          onFocus={() => setDraft(formatAmount(value))}
          onBlur={() => setDraft(null)}
          onChange={(event) => {
            const raw = event.target.value;
            const caret = event.target.selectionStart ?? raw.length;
            const parsed = parseMoney(raw);
            if (!parsed.ok) {
              setRefusal(parsed.reason);
              placeAt(Math.max(0, caret - (raw.length - shown.length)));
              return;
            }
            const next = formatDraft(raw);
            setRefusal(null);
            setDraft(next);
            placeAt(caretAfterFormat(raw, caret, next));
            onChange(parsed.value);
          }}
        />
      </div>
      <span className="field__error" id={`${id}-error`} aria-live="polite">
        {refusal === 'too-large' ? FORM.money.tooLarge : refusal ? FORM.money.characters : ''}
      </span>
      {children}
    </div>
  );
}

/**
 * A page count. An empty box is priced as one page, and says so, rather than
 * quietly dropping the recording line; leaving the box puts the 1 in it.
 */
function PagesField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const message =
    refusal === 'too-large'
      ? FORM.pages.tooMany
      : refusal
        ? FORM.pages.characters
        : value < 1
          ? FORM.pages.atLeastOne
          : '';

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        aria-describedby={`${id}-error`}
        value={value === 0 ? '' : String(value)}
        onChange={(event) => {
          const parsed = parsePageCount(event.target.value);
          setRefusal(parsed.ok ? null : parsed.reason);
          if (parsed.ok) onChange(parsed.value);
        }}
        onBlur={() => {
          if (value < 1) onChange(pagesToPrice(value));
        }}
      />
      <span className="field__error" id={`${id}-error`} aria-live="polite">
        {message}
      </span>
    </div>
  );
}

/**
 * Two or three choices, one of which is always chosen: native radios, so the
 * arrow keys, the group's name and the checked state all come from the
 * browser, drawn as the segmented control.
 */
function Segmented<T extends string>({
  name,
  labelledBy,
  describedBy,
  options,
  value,
  onChange,
}: {
  name: string;
  labelledBy: string;
  describedBy?: string;
  options: [T, string][];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="seg" role="radiogroup" aria-labelledby={labelledBy} aria-describedby={describedBy}>
      {options.map(([option, label]) => (
        <label key={option} className="seg__option">
          <input
            type="radio"
            name={name}
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
          />
          <span>{label}</span>
        </label>
      ))}
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
  const [party, setParty] = useState<Party>('buyer');
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

  // The numbers option lives in the address bar as well as the boxes, so a
  // refresh keeps it and a link to it opens on the same figures. Read once on
  // arrival; anything in the query that is not a figure this form could have
  // produced is ignored and the default stays.
  useEffect(() => {
    const apply = () => {
      const read = readNumbers(new URLSearchParams(window.location.search), [
        ...counties.map((entry) => entry.slug),
        ELSEWHERE,
      ]);
      if (read.purpose) setPurpose(read.purpose);
      if (read.party) setParty(read.party);
      if (read.county) setChosenCounty(read.county);
      if (read.price !== undefined) setPrice(read.price);
      if (read.loan !== undefined) setNumbersLoan(read.loan);
      if (read.reissue !== undefined) setReissue(read.reissue);
      if (read.prior !== undefined) setPrior(read.prior);
      if (read.singleFamily !== undefined) setSingleFamily(read.singleFamily);
      if (read.deedPages !== undefined) setDeedPages(read.deedPages);
      if (read.mortgagePages !== undefined) setMortgagePages(read.mortgagePages);
    };
    apply();
    // `counties` is the server's list and never changes, so this runs on
    // arrival only: after that the boxes are the source and the query follows.
  }, [counties]);

  const numbersShowing = !isAddress && !hidden;

  useEffect(() => {
    const timer = setTimeout(() => {
      const url = new URL(window.location.href);
      const params = numbersShowing
        ? writeNumbers(url.searchParams, {
            purpose,
            party,
            county: countySlug,
            price,
            loan: numbersLoan,
            reissue,
            prior,
            singleFamily,
            deedPages,
            mortgagePages,
          })
        : clearNumbers(url.searchParams);
      url.search = params.toString();
      // Replaced, not pushed, for the same reason the mode is: Back leaves the page.
      window.history.replaceState(window.history.state, '', url);
    }, QUERY_WRITE_MS);
    return () => clearTimeout(timer);
  }, [
    numbersShowing,
    purpose,
    party,
    countySlug,
    price,
    numbersLoan,
    reissue,
    prior,
    singleFamily,
    deedPages,
    mortgagePages,
  ]);

  const isPurchase = purpose === 'purchase';
  const loan = isAddress ? addressLoan : numbersLoan;
  // A refinance has a borrower and nobody else, so the toggle is put away and
  // the estimators are told to ignore it rather than hide half the statement.
  const side: Party = isPurchase ? party : 'buyer';
  const otherSide: Party = side === 'buyer' ? 'seller' : 'buyer';

  const result = useMemo(() => {
    // Looked up in here rather than read off `county` above: the compiler will
    // not memoize on a field read out of a prop array, and these two are the
    // only county facts the arithmetic needs.
    const entry = counties.find((candidate) => candidate.slug === countySlug);
    const countyName = entry?.name ?? RESULT.outsideDade;
    const ownerPolicyCustom = entry?.customaryOwnerPolicyPayer ?? null;

    if (isAddress) {
      const assessedResult = estimateFromAssessedValue({
        purpose,
        countySlug,
        countyName,
        party: side,
        ownerPolicyCustom,
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
        otherPartyTotal: assessedResult.otherPartyTotal,
        ownerPolicyUnassigned: assessedResult.ownerPolicyUnassigned,
      };
    }

    const input = {
      transaction: purpose,
      countySlug,
      countyName,
      party: side,
      ownerPolicyCustom,
      price,
      loanAmount: numbersLoan,
      reissue,
      priorPolicyAmount: prior,
      singleFamilyResidence: singleFamily,
      deedPages: pagesToPrice(deedPages),
      mortgagePages: pagesToPrice(mortgagePages),
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
      otherPartyTotal: priced.otherPartyTotal,
      ownerPolicyUnassigned: priced.ownerPolicyUnassigned,
    };
  }, [
    isAddress,
    counties,
    purpose,
    countySlug,
    side,
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
      ? RESULT.alternate(
          otherRateLabel(reissue),
          formatCents(result.alternate),
          formatCents(result.premiumTotal),
          // No previous policy amount, so the reissue side of the comparison is
          // rated on the whole liability: the most the old policy can save.
          prior <= 0,
        )
      : null;

  // Said only where there is another side and it is carrying something, so a
  // cash purchase does not tell a seller the buyer is paying nothing.
  const otherPartyText =
    isPurchase && result.otherPartyTotal > 0
      ? RESULT.otherParty(otherSide, formatCents(result.otherPartyTotal), result.ownerPolicyUnassigned)
      : null;

  const totalText = hasResult ? formatCents(result.total) : '—';
  const totalLabel = RESULT.totalLabel(isPurchase, side);
  const sub = hasResult
    ? RESULT.sub(isPurchase, countyName, isAddress && showingRoll ? (record?.rollYear ?? null) : null)
    : RESULT.nothingYet;
  const unknownsText = isPurchase && side === 'seller' ? RESULT.unknownsSeller : RESULT.unknowns[mode];

  const [copyStatus, setCopyStatus] = useState<'copied' | 'failed' | null>(null);

  async function copySummary() {
    const text = summaryText({
      title: ACTIONS.summaryTitle,
      sub: `${RESULT.eyebrow[mode]}. ${sub}`,
      totalLabel,
      total: result.total,
      groups: result.groups,
      foot: [alternateText, otherPartyText, `${RESULT.notInIt} ${unknownsText}`].filter(
        (line): line is string => Boolean(line),
      ),
      url: window.location.href,
    });
    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      copied = copyByHand(text);
    }
    setCopyStatus(copied ? 'copied' : 'failed');
  }

  function resetNumbers() {
    setPurpose('purchase');
    setParty('buyer');
    setChosenCounty(null);
    setPrice(CLOSING_DEFAULTS.price);
    setNumbersLoan(CLOSING_DEFAULTS.loanAmount);
    setReissue(false);
    setPrior(0);
    setSingleFamily(true);
    setDeedPages(CLOSING_DEFAULTS.deedPages);
    setMortgagePages(CLOSING_DEFAULTS.mortgagePages);
    setCopyStatus(null);
  }

  const formId = `${listId}-form`;

  return (
    <div className="calc-grid" hidden={hidden}>
      <form
        id={formId}
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
          <Segmented<Purpose>
            name={`${listId}-transaction`}
            labelledBy={`${listId}-transaction`}
            options={[
              ['purchase', FORM.transaction.purchase],
              ['refinance', FORM.transaction.refinance],
            ]}
            value={purpose}
            onChange={setPurpose}
          />
        </div>

        <div className="field">
          <span className="field__label" id={`${listId}-party`}>
            {FORM.party.label}
          </span>
          <span className="field__hint" id={`${listId}-party-hint`}>
            {isPurchase ? FORM.party.hint : FORM.party.refinanceHint}
          </span>
          {isPurchase ? (
            <Segmented<Party>
              name={`${listId}-party`}
              labelledBy={`${listId}-party`}
              describedBy={`${listId}-party-hint`}
              options={PARTIES.map((value) => [value, FORM.party[value]])}
              value={party}
              onChange={setParty}
            />
          ) : null}
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

        {/* Every line a loan produces is the borrower's, so on the seller's
            side the box would change nothing. What was typed in it stays. */}
        {side === 'buyer' ? (
          <MoneyField
            id={isAddress ? 'address-loan' : 'loan'}
            label={FORM.loan.label}
            hint={isPurchase ? FORM.loan.purchaseHint : FORM.loan.refinanceHint}
            value={loan}
            onChange={isAddress ? setAddressLoan : setNumbersLoan}
          />
        ) : null}

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

        {!isAddress && side === 'buyer' ? (
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
                    <PagesField
                      id="deed-pages"
                      label={FORM.pages.deed}
                      value={deedPages}
                      onChange={setDeedPages}
                    />
                  ) : null}
                  <PagesField
                    id="mortgage-pages"
                    label={FORM.pages.mortgage}
                    value={mortgagePages}
                    onChange={setMortgagePages}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </form>

      <FigureCard
        eyebrow={RESULT.eyebrow[mode]}
        total={totalText}
        sub={sub}
        groups={result.groups}
        totalLabel={totalLabel}
        alternateText={alternateText}
        otherPartyText={otherPartyText}
        unknownsText={unknownsText}
        emptyText={
          isAddress
            ? isPurchase
              ? RESULT.empty.addressPurchase
              : RESULT.empty.addressRefinance
            : isPurchase
              ? RESULT.empty.numbersPurchase
              : RESULT.empty.numbersRefinance
        }
        actions={
          <div className="figure-card__actions" role="group" aria-label={ACTIONS.label}>
            {hasResult ? (
              <>
                <button type="button" onClick={() => void copySummary()}>
                  {ACTIONS.copy}
                </button>
                <button type="button" onClick={() => window.print()}>
                  {ACTIONS.print}
                </button>
              </>
            ) : null}
            {!isAddress ? (
              <button type="button" onClick={resetNumbers}>
                {ACTIONS.reset}
              </button>
            ) : null}
            <span className="figure-card__status" aria-live="polite">
              {copyStatus === 'copied' ? ACTIONS.copied : copyStatus === 'failed' ? ACTIONS.copyFailed : ''}
            </span>
          </div>
        }
      />

      <TotalBar formId={formId} label={totalLabel} total={totalText} active={hasResult && !hidden} />
    </div>
  );
}
