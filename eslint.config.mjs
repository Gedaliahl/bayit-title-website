// eslint-config-next 16 ships native flat configs, so there is no FlatCompat
// shim here and no .eslintrc. `next lint` was removed in Next 16; the lint
// script calls ESLint directly instead.
import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

const config = [
  { ignores: ['.next/**', 'out/**', 'next-env.d.ts'] },
  ...coreWebVitals,
  ...typescript,
];

export default config;
