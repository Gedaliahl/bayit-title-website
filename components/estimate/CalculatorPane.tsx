'use client';

import { useEffect, useId, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';

import { ACTIONS, FORM, RESULT, type EstimateMode } from '@/content/estimate';
import {
  estimateFromAssessedValue,
  otherRateLabel,
  type Purpose,
  type ValueBasis,
} from '@/lib/assessed-estimate';
import {
  DEFAULTS as CLOSING_DEFAULTS,
  estimate,
  pagesToPrice,
  PREMIUM_GROUP_TITLE,
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
import type { OfferedSuggestion, ParcelValue, PropertySuggestion } from '@/lib/property-lookup';
import { discretionarySurtax, formatCents, formatMoney } from '@/lib/statutory-rates';
import { useEstimateMode } from './EstimateMode';
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

/**
 * Longer than the parcel route can take on its worst day — two tries at the
 * statewide roll behind a geocode — so a lookup that is going to land is not
 * cut off, and one that is not does not leave "Reading the parcel…" up.
 */
const VALUE_TIMEOUT_MS = 40_000;

/** Long enough to be a pause in typing, so the address bar is not rewritten on every key. */
const QUERY_WRITE_MS = 400;

/** What the dropdown's last answer was, beyond the rows in it. */
type SearchStatus = 'ok' | 'rate-limited' | 'unavailable' | 'outside-florida';

/**
 * Why a picked property came back without a figure, each of which the page
 * says differently: the roll would not confirm it; it is one of several units
 * and none was picked; the roll did not answer; we are asking too often; or
 * the dropdown it came from is old enough that its lookup has expired.
 */
type ValueMiss = 'declined' | 'which-unit' | 'unavailable' | 'rate-limited' | 'expired';

/** Copies through a hidden box, for a page that is not allowed to write to the clipboard directly. */
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
  const premium = groups.find((group) => group.title === PREMIUM_GROUP_TITLE);
  return premium ? premium.subtotal : null;
}

/**
 * Keeps the caret where the reader left it when a box reformats itself. Set
 * during the change, applied once React has written the new text.
 */
function useCaret() {
  const input = useRef<HTMLInputElement>(null);
  const pending = useRef<number | null>(null);
  // A refused key or a deleted comma leaves the text as it was, so React has
  // nothing to render, restores the value itself and puts the caret at the
  // end. Asking for a render is what gets the caret put back.
  const [, rerender] = useReducer((count: number) => count + 1, 0);

  useLayoutEffect(() => {
    if (pending.current === null || !input.current) return;
    if (document.activeElement === input.current) {
      input.current.setSelectionRange(pending.current, pending.current);
    }
    pending.current = null;
  });

  return {
    input,
    placeAt: (position: number) => {
      pending.current = position;
      rerender();
    },
  };
}

const digitsOf = (text: string) => text.replace(/\D/g, '');

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
          onBlur={() => {
            setDraft(null);
            setRefusal(null);
          }}
          onChange={(event) => {
            let raw = event.target.value;
            let caret = event.target.selectionStart ?? raw.length;
            // Deleting a comma would take only the comma, which the next
            // format puts straight back: take the digit beside it instead,
            // before it for Backspace and after it for Delete.
            if (raw.length === shown.length - 1 && digitsOf(raw) === digitsOf(shown)) {
              const forward = (event.nativeEvent as InputEvent).inputType === 'deleteContentForward';
              if (forward) raw = raw.slice(0, caret) + raw.slice(caret + 1);
              else if (caret > 0) {
                raw = raw.slice(0, caret - 1) + raw.slice(caret);
                caret -= 1;
              }
            }
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
          setRefusal(null);
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
  const { search } = useEstimateMode();

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
  const [answer, setAnswer] = useState<{
    query: string;
    items: OfferedSuggestion[];
    status: SearchStatus;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  /** The query a search is out for. Compared with the box, so it cannot outlive its query. */
  const [searchingFor, setSearchingFor] = useState<string | null>(null);
  /** Bumped by "Try again", which asks the same question a second time. */
  const [searchRun, setSearchRun] = useState(0);
  /** The suggestion the figures are standing on, if any. */
  const [parcel, setParcel] = useState<OfferedSuggestion | null>(null);
  /** Where the figure in the box came from, once it is the appraiser's. */
  const [record, setRecord] = useState<ParcelValue | null>(null);
  const [valueOrigin, setValueOrigin] = useState<ValueBasis>('typed');
  /** The last figure the roll put in the box, to tell it apart from one the reader typed. */
  const rollFigure = useRef<number | null>(null);
  /** Counties that publish addresses but not values need a second request. */
  const [lookingUp, setLookingUp] = useState(false);
  const [valueMissed, setValueMissed] = useState<ValueMiss | null>(null);

  // Taking a suggestion rewrites the box, which would otherwise look exactly
  // like typing and send the rewritten address straight back to the server.
  const skipNextSearch = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  /**
   * The value lookup in flight. Its id only ever goes up, and an answer is
   * applied only while its id is still the current one: a Volusia lookup that
   * lands after the reader has moved on to a Broward address must not put
   * Volusia's figure under it.
   */
  const lookup = useRef<{ id: number; controller: AbortController } | null>(null);
  const lookupCount = useRef(0);
  const listId = useId();

  const query = address.trim();
  const searchable = query.length >= MIN_QUERY_LENGTH && /\d/.test(query);
  const searching = searchable && searchingFor === query;
  const answered = answer?.query === query ? answer : null;
  const suggestions = answered?.items ?? [];
  const listOpen = isAddress && open && suggestions.length > 0;

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    if (!searchable) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearchingFor(query);
      try {
        // A POST, so the address never sits in a request line or a log.
        const response = await fetch('/api/property-search', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ q: query }),
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => null);
        const status: SearchStatus =
          response.status === 429
            ? 'rate-limited'
            : response.ok && payload
              ? (payload.status ?? 'ok')
              : 'unavailable';
        setAnswer({
          query,
          items: response.ok && Array.isArray(payload?.suggestions) ? payload.suggestions : [],
          status,
        });
        setActiveIndex(-1);
        // Only for a reader still in the box. An answer that lands after they
        // have tabbed away would otherwise open the list over the next field.
        if (document.activeElement === inputRef.current) setOpen(true);
      } catch {
        // Usually the next keystroke aborting this one. A request that truly
        // failed is said to have failed, rather than to have found nothing.
        if (!controller.signal.aborted) setAnswer({ query, items: [], status: 'unavailable' });
      } finally {
        if (!controller.signal.aborted) setSearchingFor(null);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchable, searchRun]);

  // The option the arrow keys are on stays in sight in a list that scrolls.
  useEffect(() => {
    if (!listOpen || activeIndex < 0) return;
    document.getElementById(`${listId}-option-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [listOpen, activeIndex, listId]);

  function countyInList(slug: string | null): string {
    return slug && counties.some((entry) => entry.slug === slug) ? slug : ELSEWHERE;
  }

  /** Stops a value lookup, so that nothing it finds lands on whatever the reader did next. */
  function cancelLookup() {
    lookup.current?.controller.abort();
    lookup.current = null;
    setLookingUp(false);
  }

  /**
   * Puts a roll figure in the box and remembers whose it is. The just value
   * where the roll has one: it is the appraiser's estimate of market value,
   * where the assessed value on a long-held homestead can be half of it. The
   * assessed value is offered beside it.
   */
  function applyValue(value: ParcelValue) {
    setRecord(value);
    if (value.justValue) {
      setAssessed(value.justValue);
      rollFigure.current = value.justValue;
      setValueOrigin('just');
    } else if (value.assessedValue) {
      setAssessed(value.assessedValue);
      rollFigure.current = value.assessedValue;
      setValueOrigin('assessed');
    } else {
      setValueOrigin('typed');
    }
  }

  async function lookUpValue(suggestion: OfferedSuggestion) {
    cancelLookup();
    lookupCount.current += 1;
    const id = lookupCount.current;
    const controller = new AbortController();
    lookup.current = { id, controller };
    const isCurrent = () => lookup.current?.id === id;
    const timer = setTimeout(() => controller.abort(), VALUE_TIMEOUT_MS);

    setLookingUp(true);
    setValueMissed(null);
    try {
      const response = await fetch('/api/parcel-value', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          address: suggestion.address,
          countyName: suggestion.countyName,
          parcelId: suggestion.parcelId,
          lookup: suggestion.valueLookup,
          token: suggestion.lookupToken,
        }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null);
      if (!isCurrent()) return;

      if (payload?.status === 'found' && payload.value) {
        const value = payload.value as ParcelValue;
        // A statewide geocoder's suggestion has no county until the roll names one.
        if (value.countySlug && value.countySlug !== suggestion.countySlug) {
          setChosenCounty(countyInList(value.countySlug));
        }
        applyValue(value);
      } else {
        setValueMissed(
          response.status === 429
            ? 'rate-limited'
            : payload?.status === 'expired'
              ? 'expired'
              : payload?.status === 'declined'
                ? payload.reason === 'which-unit'
                  ? 'which-unit'
                  : 'declined'
                : 'unavailable',
        );
      }
    } catch {
      // Aborted by the reader moving on, which says nothing, or by the
      // timeout, which is the roll not answering.
      if (isCurrent()) setValueMissed('unavailable');
    } finally {
      clearTimeout(timer);
      if (isCurrent()) {
        lookup.current = null;
        setLookingUp(false);
      }
    }
  }

  function takeSuggestion(suggestion: OfferedSuggestion) {
    cancelLookup();
    const line = suggestionLine(suggestion);
    // Only where the box actually changes: an unchanged box runs no search to
    // skip, and the flag would swallow the next one typed.
    if (line !== address) skipNextSearch.current = true;
    setAddress(line);
    setOpen(false);
    setActiveIndex(-1);
    setSearchingFor(null);
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
        homestead: suggestion.homestead,
        lastSale: suggestion.lastSale,
        sourceName: suggestion.sourceName,
        sourceUrl: suggestion.sourceUrl,
      });
      return;
    }

    // The box may still hold the last property's roll figure — kept through
    // an edit to the address, which is often a typo fixed. Picking another
    // property is not, so that figure goes; a figure the reader typed stays.
    if (rollFigure.current !== null && assessed === rollFigure.current) setAssessed(0);
    rollFigure.current = null;
    setRecord(null);
    setValueOrigin('typed');
    if (suggestion.valueLookup) void lookUpValue(suggestion);
  }

  /** "Try again" on the dropdown: the same question, asked again. */
  function searchAgain() {
    skipNextSearch.current = false;
    inputRef.current?.focus();
    setSearchRun((run) => run + 1);
  }

  /** "Try again" under the value: the same lookup, or a fresh list where the old one has expired. */
  function lookUpAgain() {
    if (valueMissed === 'expired' || !parcel?.valueLookup) searchAgain();
    else void lookUpValue(parcel);
  }

  function onAddressKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    // Enter and the arrows belong to an input method while it is composing.
    if (event.nativeEvent.isComposing) return;
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
    } else if ((event.key === 'Home' || event.key === 'End') && activeIndex >= 0) {
      // Only once the arrows are in the list; before that they move the caret.
      event.preventDefault();
      setActiveIndex(event.key === 'Home' ? 0 : suggestions.length - 1);
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
    // Wrapped so the read is one call rather than state set in the effect's
    // body line by line: the URL is outside React, and this is the one moment
    // it is copied in.
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

  // Also re-run whenever the query changes under it — Back past an in-page
  // link restores an older query, and the masthead's Estimate link drops it —
  // so the address bar is put back in step with the boxes rather than left
  // saying figures they no longer show.
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
    search,
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
        valueBasis: valueOrigin,
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
    valueOrigin,
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
      {/* Only what the roll says: a homestead flag where it keeps one, and a
          sale where it records one at a real price. */}
      {record.homestead ? FORM.assessed.onRoll.homestead : ''}
      {record.lastSale
        ? FORM.assessed.onRoll.sale(formatMoney(record.lastSale.price), record.lastSale.year)
        : ''}
    </>
  ) : (
    <>
      {/* Why the box is empty comes first, wherever the property is; then
          the errand — the link where the county has one, the general advice
          where it does not — and last, where asking again could help, the
          button that does. */}
      {valueMissed ? `${FORM.assessed.missed[valueMissed]} ` : null}
      {county?.propertyAppraiserUrl ? (
        <>
          {valueCounty && !valueMissed ? FORM.assessed.pickOr : FORM.assessed.lookUp}
          <a href={county.propertyAppraiserUrl} rel="nofollow noopener" target="_blank">
            {FORM.assessed.appraiser(county.name)}
          </a>
          {FORM.assessed.copyAcross}
        </>
      ) : (
        FORM.assessed.anyCounty
      )}
      {valueMissed === 'unavailable' || valueMissed === 'rate-limited' || valueMissed === 'expired' ? (
        <>
          {' '}
          <button type="button" className="linkish" onClick={lookUpAgain}>
            {FORM.assessed.tryAgain}
          </button>
        </>
      ) : null}
    </>
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

  /**
   * Back to the page as it loaded. The transaction, the side and the county
   * are shared with the address option, so the property picked there goes
   * too, or it would be left describing a county the select no longer shows.
   */
  function startAgain() {
    cancelLookup();
    setAddress('');
    setParcel(null);
    setRecord(null);
    setValueMissed(null);
    setAssessed(0);
    setValueOrigin('typed');
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

  // What the line under the address box says. The count is announced when
  // the list opens, so a screen reader hears that there is something to
  // arrow through; the rest say why there is not.
  const searchStatusText = searching
    ? FORM.address.looking
    : !answered
      ? ''
      : answered.status === 'outside-florida'
        ? FORM.address.floridaOnly
        : answered.status === 'rate-limited'
          ? FORM.address.rateLimited
          : answered.status === 'unavailable'
            ? FORM.address.unavailable
            : suggestions.length === 0
              ? FORM.address.nothing
              : listOpen
                ? FORM.address.found(suggestions.length)
                : '';
  const canSearchAgain =
    !searching && (answered?.status === 'rate-limited' || answered?.status === 'unavailable');

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
            <div className="combo__anchor">
              <input
                ref={inputRef}
                id="address"
                autoComplete="off"
                maxLength={160}
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
                  cancelLookup();
                  // A new address means the figure below is no longer this
                  // property's. The number stays; it stops claiming to be the roll's.
                  if (parcel || record || valueMissed) {
                    setParcel(null);
                    setRecord(null);
                    setValueOrigin('typed');
                    setValueMissed(null);
                  }
                }}
                onKeyDown={onAddressKeyDown}
                onFocus={(event) => {
                  if (suggestions.length > 0) setOpen(true);
                  // On a phone the keyboard takes half the screen, so the box is
                  // brought to the top of what is left, with room under it for
                  // the list.
                  if (window.matchMedia('(max-width: 40rem)').matches) {
                    const field = event.currentTarget.closest('.combo') ?? event.currentTarget;
                    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                    requestAnimationFrame(() =>
                      field.scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' }),
                    );
                  }
                }}
                onBlur={() => setOpen(false)}
              />

              {/* Always in the page, so aria-controls always names something;
                  hidden, and empty, while it is closed. Mouse down anywhere on it
                  — an option, the gap between two, its scrollbar — is kept from
                  taking focus off the input and closing it. */}
              <ul
                className="combo__list"
                id={listId}
                role="listbox"
                aria-label={FORM.address.listLabel}
                hidden={!listOpen}
                onMouseDown={(event) => event.preventDefault()}
              >
                {listOpen
                  ? suggestions.map((suggestion, index) => (
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
                      // Move rather than enter: the list scrolling under a
                      // still pointer fires enter, and would take the
                      // highlight away from the arrow keys.
                      onMouseMove={() => {
                        if (index !== activeIndex) setActiveIndex(index);
                      }}
                    >
                      <span className="combo__address">{suggestion.address}</span>
                      <span className="combo__value">
                        {suggestion.justValue
                          ? FORM.address.justValue(formatMoney(suggestion.justValue))
                          : suggestion.assessedValue
                            ? FORM.address.assessedValue(formatMoney(suggestion.assessedValue))
                            : suggestion.valueLookup
                              ? FORM.address.valueOnPick
                              : FORM.address.noRoll}
                      </span>
                      <span className="combo__meta">
                        {[suggestion.city, suggestion.zip, suggestion.countyName].filter(Boolean).join(' · ')}
                      </span>
                    </li>
                  ))
                  : null}
              </ul>
            </div>

            <span className="field__hint combo__status">
              <span aria-live="polite">{searchStatusText}</span>
              {canSearchAgain ? (
                <>
                  {' '}
                  <button type="button" className="linkish" onClick={searchAgain}>
                    {FORM.address.tryAgain}
                  </button>
                </>
              ) : null}
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
            {isAddress && parcel && countyInList(parcel.countySlug) === countySlug
              ? FORM.county.fromParcel(parcel.countyName)
              : FORM.county.hint(isAddress)}
          </span>
          <select
            id={`${listId}-county`}
            aria-describedby={`${listId}-county-hint`}
            value={countySlug}
            onChange={(event) => {
              // A lookup still out would otherwise land and put its own county back.
              cancelLookup();
              setChosenCounty(event.target.value);
            }}
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
              cancelLookup();
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
            {/* Always in the page, so the button's aria-controls names something. */}
            <div className="disclosure__body" id={`${listId}-pages`} hidden={!pagesOpen}>
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
              <button type="button" onClick={startAgain}>
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
