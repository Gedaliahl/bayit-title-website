'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Moves focus to the first field a failed submit rejected.
 *
 * Without it a failed submit is silent on a phone. The submit button sits at
 * the bottom of a long form, the errors render above the fold, and nothing
 * scrolls — so tapping "Open the order" on an incomplete form looks exactly
 * like tapping a button that does not work. Measured on a 375px viewport: four
 * errors rendered, none of them on screen.
 *
 * Focus is also lost outright. The button disables itself while the request is
 * in flight, which drops focus onto <body>, so a keyboard user who submits has
 * to tab back down from the top of the page to find what went wrong.
 *
 * Focusing the field answers all three audiences at once: it scrolls the error
 * into view, puts the caret where the correction gets typed, and gives a screen
 * reader the label and the error text together through the aria-describedby the
 * fields already carry.
 */
export function useErrorFocus() {
  const formRef = useRef<HTMLFormElement>(null);
  const [failures, setFailures] = useState(0);

  useEffect(() => {
    // Nothing to move on first render, only after a submit comes back bad.
    if (failures === 0) return;

    const form = formRef.current;
    if (!form) return;

    const target =
      form.querySelector<HTMLElement>('[aria-invalid="true"]') ??
      // No single field to blame — a rate limit, or an outage. Send them to the
      // banner that explains it, which is otherwise off-screen too. The contract
      // form on /estimate says it in the line beside its button instead.
      form.querySelector<HTMLElement>('.form-status--error, .form-card__status--error');

    target?.focus();
  }, [failures]);

  /** Call on every path that leaves the form in a failed state. */
  const reportFailure = () => setFailures((count) => count + 1);

  return { formRef, reportFailure };
}
