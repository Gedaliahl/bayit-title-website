'use client';

import type { ReactNode } from 'react';

import { formatBytes } from '@/lib/documents';

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

/**
 * Attachments. Controlled from the form rather than read off the DOM at submit
 * time, because a person who picks three files and then one more expects four —
 * a plain multiple input would replace the set.
 */
export function FileField({
  files,
  onAdd,
  onRemove,
  accept,
  disabled,
  ...props
}: BaseProps & {
  files: File[];
  onAdd: (added: File[]) => void;
  onRemove: (index: number) => void;
  accept: string;
  disabled?: boolean;
}) {
  return (
    <Wrapper {...props}>
      <input
        id={props.name}
        name={props.name}
        type="file"
        multiple
        accept={accept}
        disabled={disabled}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={describedBy(props.name, props.hint, props.error)}
        onChange={(event) => {
          onAdd(Array.from(event.target.files ?? []));
          // Clear it, so picking the same file again after removing it still fires.
          event.target.value = '';
        }}
      />

      {files.length > 0 ? (
        <ul className="file-list">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${index}`}>
              <span className="file-list__name">{file.name}</span>
              <span className="file-list__size">{formatBytes(file.size)}</span>
              <button
                type="button"
                className="file-list__remove"
                onClick={() => onRemove(index)}
                disabled={disabled}
              >
                Remove<span className="visually-hidden"> {file.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
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
