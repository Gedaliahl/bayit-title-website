// The live check. Same aliases as the unit config, pointed at the one suite
// that is deliberately excluded from `npm test`: tests/rolls.live.test.ts asks
// every county service in lib/county-rolls.ts whether it still answers, still
// carries the columns named there, and still returns money in them.
//
// It fails when another office moves a service, which is a real thing that
// happens and is worth finding out before a reader does.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': root,
      'server-only': `${root}tests/stubs/server-only.ts`,
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.live.test.ts'],
    // Sixty services, several requests each, all of them somebody else's.
    testTimeout: 120_000,
    hookTimeout: 120_000,
    pool: 'forks',
  },
});
