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
    // Forks rather than threads: the content tests chdir into a fixture tree,
    // and process.chdir is unavailable inside a worker thread.
    pool: 'forks',
  },
});
