import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // Mirrors the "@/*" path mapping in tsconfig.json.
      '@': root,
      'server-only': `${root}tests/stubs/server-only.ts`,
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // *.live.test.ts talks to sixty other offices' services. It is a check on
    // whether their data has moved, not on whether this code is correct, so it
    // is run on purpose — `npm run check:rolls` — and never as part of `npm test`.
    exclude: ['**/node_modules/**', 'tests/**/*.live.test.ts'],
    // Forks rather than threads: the content tests chdir into a fixture tree,
    // and process.chdir is unavailable inside a worker thread.
    pool: 'forks',
  },
});
