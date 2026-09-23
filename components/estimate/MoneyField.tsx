'use client';

import { useLayoutEffect, useReducer, useRef, useState } from 'react';

import { FORM } from '@/content/estimate';
import { caretAfterFormat, formatAmount, formatDraft, parseMoney, type Refusal } from '@/lib/estimate-input';

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
export function MoneyField({
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
