'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { DEFAULT_MODE, isEstimateMode, type EstimateMode } from '@/content/estimate';

interface ModeContext {
  mode: EstimateMode;
  /** Sets the mode and, on a narrow screen, brings the estimator into view. */
  setMode: (mode: EstimateMode) => void;
}

const Context = createContext<ModeContext>({ mode: DEFAULT_MODE, setMode: () => {} });

/** Below this the hero and the estimator no longer share a screen. */
const NARROW = '(max-width: 62rem)';

/**
 * Which of the three ways in is open, shared by the router card in the hero,
 * the tabs in the estimator band and the call to action at the foot of the
 * page — three places on one page that all set the same thing.
 *
 * The mode is carried in the URL as `?mode=`, so a link to the calculator can
 * land on the calculator and the old /calculator address can redirect to it.
 * It is read once the page is on screen rather than during render: the page is
 * prerendered, and reading the query on the server would either cost it that
 * or leave the estimator out of the HTML behind a Suspense boundary. The cost
 * is one repaint for a reader who arrives with a mode in the URL, which the
 * server HTML already carries the default for. Changing the mode replaces the
 * history entry rather than pushing one, so Back leaves the page rather than
 * stepping through tabs.
 */
export function EstimateModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<EstimateMode>(DEFAULT_MODE);

  useEffect(() => {
    const read = () => {
      const wanted = new URLSearchParams(window.location.search).get('mode');
      setModeState(isEstimateMode(wanted) ? wanted : DEFAULT_MODE);
    };
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);

  const setMode = useCallback((next: EstimateMode) => {
    setModeState(next);

    const url = new URL(window.location.href);
    if (next === DEFAULT_MODE) url.searchParams.delete('mode');
    else url.searchParams.set('mode', next);
    // Next's router listens to this, so usePathname and useSearchParams stay in step.
    window.history.replaceState(window.history.state, '', url);

    // At desktop width the estimator is already beside or just under the
    // router card and updates in place. On a phone it is a screen away.
    if (window.matchMedia(NARROW).matches) {
      document.getElementById('estimator')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return <Context.Provider value={{ mode, setMode }}>{children}</Context.Provider>;
}

export function useEstimateMode(): ModeContext {
  return useContext(Context);
}
