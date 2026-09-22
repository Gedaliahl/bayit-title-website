'use client';

import { useEffect, useState } from 'react';

import { RESULT } from '@/content/estimate';
import { FIGURES_ID } from './FigureCard';

/** Boxes that bring up a phone's keyboard, which the bar would sit on top of. */
const TYPED = 'input:not([type="checkbox"]):not([type="radio"]), select, textarea';

/**
 * The running total, pinned to the foot of a phone's screen while the form is
 * on it. Below 40rem the card is under the form, a screen or two down, and a
 * reader changing the loan would otherwise be changing a figure they cannot
 * see. CSS keeps it off wider screens, where the card is beside the form.
 *
 * It gets out of the way twice: once the card itself is in view, since it
 * would only repeat it, and while a box is being typed in, since the keyboard
 * is up and the bar would sit on the field.
 */
export function TotalBar({
  formId,
  label,
  total,
  active,
}: {
  formId: string;
  label: string;
  total: string;
  /** False with nothing priced, or with the pane hidden behind another option. */
  active: boolean;
}) {
  const [formInView, setFormInView] = useState(false);
  const [cardInView, setCardInView] = useState(false);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const form = document.getElementById(formId);
    const card = document.getElementById(FIGURES_ID);
    if (!form || !card || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === form) setFormInView(entry.isIntersecting);
        if (entry.target === card) setCardInView(entry.isIntersecting);
      }
    });
    observer.observe(form);
    observer.observe(card);

    const onFocusIn = (event: FocusEvent) =>
      setTyping(event.target instanceof Element && event.target.matches(TYPED));
    const onFocusOut = () => setTyping(false);
    form.addEventListener('focusin', onFocusIn);
    form.addEventListener('focusout', onFocusOut);

    return () => {
      observer.disconnect();
      form.removeEventListener('focusin', onFocusIn);
      form.removeEventListener('focusout', onFocusOut);
    };
  }, [formId]);

  return (
    <div className="total-bar" hidden={!(active && formInView && !cardInView && !typing)}>
      <span className="total-bar__label">{label}</span>
      <span className="total-bar__total">{total}</span>
      <a className="total-bar__link" href={`#${FIGURES_ID}`}>
        {RESULT.seeBreakdown}
      </a>
    </div>
  );
}
