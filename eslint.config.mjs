// Flat config. eslint-config-next 16 ships native flat configs, so there is no
// FlatCompat shim here and no .eslintrc. `next lint` was removed in Next 16 —
// the lint script calls ESLint directly instead.
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

// ESLint stays on 9.x: eslint-config-next 16 bundles an eslint-plugin-react
// that throws on ESLint 10 ("contextOrFilename.getFilename is not a function").
const config = [
  {
    ignores: ['.next/**', 'out/**', 'node_modules/**', 'next-env.d.ts'],
  },

  ...nextCoreWebVitals,
  ...nextTypeScript,

  {
    rules: {
      // An unused import is usually a half-finished edit. Underscore-prefixed
      // names stay allowed for the deliberate throwaway.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },

  {
    // lib/supabase.ts and lib/document-storage.ts log loudly on purpose: a
    // misconfigured deploy that renders normally is worse than a noisy one.
    files: ['lib/**/*.ts', 'app/api/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
];

export default config;
