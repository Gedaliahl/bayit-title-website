// axe on every route, at a phone width and a desktop width, against WCAG 2.2
// AA. Only serious and critical results fail: axe's moderate and minor rules
// are mostly best practice rather than conformance, and the matrix already
// covers the ones this site has cared about (one h1, heading order, alt text,
// target size).
//
// axe cannot judge everything 2.2 AA asks — whether alt text is any good,
// whether focus order makes sense — which is what the real-device pass in the
// plan (Phase 9, item 7) is for.
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { routes } from './routes';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * Violations the app has not fixed yet, by rule and route. Each is left out
 * of the sweep and given a test.fixme of its own; fixing it means deleting
 * the entry.
 */
const KNOWN: { rule: string; path: string; reason: string }[] = [];

for (const width of [375, 1280]) {
  test(`axe finds nothing serious on any route at ${width}px`, async ({ browser, request, baseURL }) => {
    test.slow();
    const list = await routes(request);
    const context = await browser.newContext({ baseURL, viewport: { width, height: 900 } });
    const page = await context.newPage();

    for (const route of list) {
      await page.goto(route.path);
      await page.evaluate(() => document.fonts.ready);
      const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      const serious = violations
        .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
        .filter((violation) => !KNOWN.some((bug) => bug.rule === violation.id && bug.path === route.path))
        .map((violation) => ({
          rule: violation.id,
          impact: violation.impact,
          help: violation.help,
          nodes: violation.nodes.slice(0, 5).map((node) => node.target.join(' ')),
        }));
      expect.soft(serious, `${route.path} at ${width}px`).toEqual([]);
    }
    await context.close();
  });
}

for (const bug of KNOWN) {
  test.fixme(`${bug.path}, ${bug.rule}: ${bug.reason}`, async ({ page }) => {
    await page.goto(bug.path);
    const { violations } = await new AxeBuilder({ page }).withRules([bug.rule]).analyze();
    expect(violations).toEqual([]);
  });
}
