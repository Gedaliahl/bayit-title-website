'use client';

import type { ReactNode } from 'react';

interface BaseProps {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

function Wrapper({
  name,
  label,
  hint,
  error,
  required,
  children,
}: BaseProps & { children: ReactNode }) {
  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <label htmlFor={name}>
        {label}
        {required ? null : <span className="field__hint"> (optional)</span>}
      </label>
      {hint ? (
        <span className="field__hint" id={`${name}-hint`}>
          {hint}
        </span>
      ) : null}
      {children}
      {error ? (
        <span className="field__error" id={`${name}-error`} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function describedBy(name: string, hint?: string, error?: string): string | undefined {
  const ids = [hint ? `${name}-hint` : null, error ? `${name}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
}

export function TextField({
  type = 'text',
  autoComplete,
  inputMode,
  ...props
}: BaseProps & {
  type?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'tel' | 'email' | 'numeric' | 'decimal';
}) {
  return (
    <Wrapper {...props}>
      <input
        id={props.name}
        name={props.name}
        type={type}
        required={props.required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={describedBy(props.name, props.hint, props.error)}
      />
    </Wrapper>
  );
}

export function TextArea(props: BaseProps & { rows?: number }) {
  return (
    <Wrapper {...props}>
      <textarea
        id={props.name}
        name={props.name}
        rows={props.rows ?? 5}
        required={props.required}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={describedBy(props.name, props.hint, props.error)}
      />
    </Wrapper>
  );
}

export function SelectField({
  options,
  placeholder = 'Select…',
  ...props
}: BaseProps & { options: { value: string; label: string }[]; placeholder?: string }) {
  return (
    <Wrapper {...props}>
      <select
        id={props.name}
        name={props.name}
        required={props.required}
        defaultValue=""
        aria-invalid={props.error ? true : undefined}
        aria-describedby={describedBy(props.name, props.hint, props.error)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Wrapper>
  );
}

/** Off-screen field. A real person never sees it; a bot fills it in. */
export function Honeypot() {
  return (
    <div className="hp" aria-hidden="true">
      <label htmlFor="company">Company</label>
      <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
    </div>
  );
}
