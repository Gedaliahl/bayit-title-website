'use client';

import { useSearchParams } from 'next/navigation';
import { createContext, Suspense, useCallback, useContext, useEffect, useState } from 'react';

import { DEFAULT_MODE, isEstimateMode, type EstimateMode } from '@/content/estimate';

interface ModeContext {
  mode: EstimateMode;
  /**
   * Sets the mode. From outside the estimator — the router card, the call to
   * action — `reveal` also brings the estimator into view and puts focus on
   * the heading of the panel that opened, so a keyboard or screen reader user
   * lands where a sighted reader is looking. The mode buttons themselves leave
   * focus where it is.
   */
  setMode: (mode: EstimateMode, options?: { reveal?: boolean }) => void;
  /**
   * The query as it stands. It changes on Back, on a link to this same page
   * and on the page's own writes, and anything that keeps the query in step
   * with the boxes re-runs on it.
   */
  search: string;
}

const Context = createContext<ModeContext>({ mode: DEFAULT_MODE, setMode: () => {}, search: '' });

/** Below this the hero and the estimator no longer share a screen. */
const NARROW = '(max-width: 62rem)';

/** The heading focus is moved to. Address and numbers share one panel. */
export function panelHeadingId(mode: EstimateMode): string {
  return mode === 'upload' ? 'estimator-heading-upload' : 'estimator-heading-figures';
}

/** Asked for less motion, the page jumps rather than glides. */
export function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

/**
 * Which of the three ways in is open, shared by the router card in the hero,
 * the tabs in the estimator band and the call to action at the foot of the
 * page — three places on one page that all set the same thing.
 *
 * The mode is carried in the URL as `?mode=`, so a link to the calculator can
 * land on the calculator and the old /calculator address can redirect to it.
 * It is followed from the query once the page is on screen rather than read
 * during render: the page is prerendered, and reading the query on the server
 * would either cost it that or leave the estimator out of the HTML. So only
 * FollowQuery, which renders nothing, waits behind a Suspense boundary. The
 * cost is one repaint for a reader who arrives with a mode in the URL, which
 * the server HTML already carries the default for. Following the query rather
 * than reading it once also catches a click on the masthead's Estimate link
 * from /estimate?mode=upload, which changes the URL without reloading the page.
 * Changing the mode replaces the history entry rather than pushing one, so
 * Back leaves the page rather than stepping through tabs.
 */
export function EstimateModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<EstimateMode>(DEFAULT_MODE);
  const [search, setSearch] = useState('');

  const setMode = useCallback((next: EstimateMode, options?: { reveal?: boolean }) => {
    setModeState(next);

    const url = new URL(window.location.href);
    if (next === DEFAULT_MODE) url.searchParams.delete('mode');
    else url.searchParams.set('mode', next);
    // Next's router listens to this, so usePathname and useSearchParams stay in step.
    window.history.replaceState(window.history.state, '', url);

    if (!options?.reveal) return;

    // At desktop width the estimator is usually already on screen, just under
    // the router card, and updates in place. On a phone, or from the foot of
    // the page, it is a screen or more away.
    const estimator = document.getElementById('estimator');
    const top = estimator?.getBoundingClientRect().top ?? 0;
    if (window.matchMedia(NARROW).matches || top < 0 || top > window.innerHeight * 0.75) {
      estimator?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    }
    // After the render that unhides the panel, or there is nothing to focus.
    requestAnimationFrame(() => {
      document.getElementById(panelHeadingId(next))?.focus({ preventScroll: true });
    });
  }, []);

  return (
    <Context.Provider value={{ mode, setMode, search }}>
      <Suspense fallback={null}>
        <FollowQuery onMode={setModeState} onSearch={setSearch} />
      </Suspense>
      {children}
    </Context.Provider>
  );
}

function FollowQuery({
  onMode,
  onSearch,
}: {
  onMode: (mode: EstimateMode) => void;
  onSearch: (search: string) => void;
}) {
  const params = useSearchParams();
  const wanted = params.get('mode');
  const search = params.toString();

  useEffect(() => {
    onMode(isEstimateMode(wanted) ? wanted : DEFAULT_MODE);
  }, [wanted, onMode]);

  useEffect(() => {
    onSearch(search);
  }, [search, onSearch]);

  return null;
}

export function useEstimateMode(): ModeContext {
  return useContext(Context);
}
