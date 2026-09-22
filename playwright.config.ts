// The browser suite: every route at every width, axe on every route, and the
// flows that tests/ cannot reach because they only exist in a browser.
//
// It runs against `next build && next start`, never `next dev`. The dev server
// compiles on first request, logs its own warnings to the console the matrix
// fails on, and ships a different bundle from the one the public gets.
//
// Locally only Chromium is used, since it is the browser a plain install of
// Playwright can be counted on to find. CI installs all three and adds a
// WebKit phone (Safari is where a layout breaks first) and a Firefox smoke
// run; E2E_ALL_BROWSERS=1 does the same on a machine that has them.
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3206);
const baseURL = `http://localhost:${PORT}`;
const ci = Boolean(process.env.CI);
const allBrowsers = ci || process.env.E2E_ALL_BROWSERS === '1';

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.results',
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  workers: ci ? 2 : undefined,
  reporter: [['list'], ['html', { outputFolder: './e2e/.report', open: 'never' }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL,
    trace: 'retain-on-failure',
  },

  webServer: {
    // The production build, with drafts left out as they are for the public:
    // the matrix checks that a draft's address answers 404. CI builds in a
    // step of its own, so a build failure is reported as one, and says so
    // with E2E_PREBUILT.
    command: `${process.env.E2E_PREBUILT ? '' : 'npm run build && '}npm run start -- -p ${PORT}`,
    // Served over http, so the build must leave out upgrade-insecure-requests
    // (see next.config.mjs). CI sets the same on its separate build step.
    env: { E2E_PLAIN_HTTP: '1' },
    url: baseURL,
    reuseExistingServer: !ci,
    timeout: 300_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // The matrix and axe set their own widths, so a second pass of them
      // under a phone's user agent would repeat the same pages. The flows are
      // what changes on a touch screen.
      name: 'mobile-chromium',
      testMatch: 'flows.spec.ts',
      use: { ...devices['Pixel 7'] },
    },
    ...(allBrowsers
      ? [
          {
            name: 'mobile-webkit',
            testMatch: ['flows.spec.ts', 'matrix.spec.ts'],
            use: { ...devices['iPhone 13'] },
          },
          {
            name: 'firefox-smoke',
            testMatch: 'flows.spec.ts',
            grep: /@smoke/,
            use: { ...devices['Desktop Firefox'] },
          },
        ]
      : []),
  ],
});
