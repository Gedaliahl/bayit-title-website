// Every route at every width that has broken a layout somewhere: the folded
// Galaxy Fold at 280, the phones, a phone on its side, the tablets, and the
// desktops up to 2560. Each page is checked for the things a reader notices
// or a screen reader trips over, and for anything the page itself says went
// wrong in the console or the network panel.
//
// One test per width, each with its own context and a single page reused for
// every route, so the fourteen run in parallel and a route costs one
// navigation. Findings are collected for the whole walk and reported per
// check with expect.soft, so one bad page does not hide the rest.
import { expect, test, type Page } from '@playwright/test';

import { routes, type Route } from './routes';

const WIDTHS: { width: number; height: number; label?: string }[] = [
  { width: 280, height: 653 },
  { width: 320, height: 568 },
  { width: 360, height: 740 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 414, height: 896 },
  { width: 568, height: 320, label: 'landscape phone' },
  { width: 768, height: 1024 },
  { width: 820, height: 1180 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
];

type Check = 'status' | 'overflow' | 'console' | 'requests' | 'h1' | 'headings' | 'alt' | 'targets';

interface Finding {
  check: Check;
  path: string;
  detail: string;
}

/**
 * Real bugs the matrix has found and the app has not fixed yet. Each is left
 * out of the walk's findings and given a test.fixme of its own that checks
 * for exactly that bug, so the rest of the page is still held to every rule.
 * Fixing the bug means deleting its entry here.
 */
const KNOWN: { check: Check; path: string; widths?: number[]; reason: string }[] = [];

function isKnown(finding: Finding, width: number): boolean {
  return KNOWN.some(
    (bug) =>
      bug.check === finding.check &&
      bug.path === finding.path &&
      (!bug.widths || bug.widths.includes(width)),
  );
}

/**
 * Everything checked once the page has loaded. It runs inside the page, so
 * it can use nothing else from this file.
 */
function inspect() {
  const hiddenFromEveryone = (element: Element): boolean => {
    if (element.closest('[hidden], [aria-hidden="true"], template')) return true;
    const style = getComputedStyle(element);
    return style.display === 'none' || style.visibility === 'hidden';
  };

  const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
    .filter((heading) => !hiddenFromEveryone(heading))
    .map((heading) => ({ level: Number(heading.tagName[1]), text: (heading.textContent ?? '').trim().slice(0, 60) }));

  const skipped: string[] = [];
  let previous = 0;
  for (const heading of headings) {
    if (heading.level > previous + 1) skipped.push(`h${previous || '(none)'} then h${heading.level} "${heading.text}"`);
    previous = heading.level;
  }

  const missingAlt = [...document.querySelectorAll('img')]
    .filter((image) => !image.hasAttribute('alt'))
    .map((image) => image.getAttribute('src') ?? '(no src)');

  // WCAG 2.2 target size (minimum), 2.5.8: 24 by 24 CSS pixels, unless the
  // target is a link in a line of text, or is spaced so that a 24px circle on
  // its centre touches no other target (nor another small target's circle).
  // A radio or checkbox is measured by its label where it has one, since the
  // label takes the tap too. Something drawn at a pixel or less is the
  // visually-hidden pattern, and so is measured by its label or not at all.
  const interactive = [
    ...document.querySelectorAll<HTMLElement>(
      'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((element) => !hiddenFromEveryone(element));

  const targetRect = (element: HTMLElement): DOMRect => {
    const own = element.getBoundingClientRect();
    if (!(element instanceof HTMLInputElement) || !element.labels?.length) return own;
    const label = [...element.labels]
      .map((candidate) => candidate.getBoundingClientRect())
      .sort((a, b) => b.width * b.height - a.width * a.height)[0]!;
    return label.width * label.height > own.width * own.height ? label : own;
  };

  // In a sentence: an inline link whose nearest block has words besides its own.
  const inSentence = (element: HTMLElement): boolean => {
    if (element.tagName !== 'A' || getComputedStyle(element).display !== 'inline') return false;
    let block = element.parentElement;
    while (block && getComputedStyle(block).display === 'inline') block = block.parentElement;
    const own = (element.textContent ?? '').trim().length;
    return (block?.textContent ?? '').trim().length > own;
  };

  const targets = interactive
    .map((element) => ({ element, rect: targetRect(element) }))
    .filter(({ rect }) => rect.width > 1 || rect.height > 1);
  const undersized = targets.filter(
    ({ element, rect }) => (rect.width < 24 || rect.height < 24) && !inSentence(element),
  );
  const centre = (rect: DOMRect) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  const distanceToRect = (point: { x: number; y: number }, rect: DOMRect) => {
    const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
    const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
    return Math.hypot(dx, dy);
  };

  const small: string[] = [];
  for (const target of undersized) {
    const c = centre(target.rect);
    const crowded = targets.some((other) => {
      if (other === target || other.element.contains(target.element) || target.element.contains(other.element)) {
        return false;
      }
      if (distanceToRect(c, other.rect) < 12) return true;
      if (!undersized.includes(other)) return false;
      const o = centre(other.rect);
      return Math.hypot(c.x - o.x, c.y - o.y) < 24;
    });
    if (!crowded) continue;
    const name = (target.element.getAttribute('aria-label') ?? target.element.textContent ?? '').trim().slice(0, 40);
    small.push(
      `<${target.element.tagName.toLowerCase()}> "${name}" ${Math.round(target.rect.width)}x${Math.round(target.rect.height)}`,
    );
  }

  const root = document.documentElement;
  return {
    scrollWidth: root.scrollWidth,
    clientWidth: root.clientWidth,
    h1s: document.querySelectorAll('h1').length,
    skipped,
    missingAlt,
    small,
  };
}

async function walk(page: Page, origin: string, list: Route[]): Promise<Finding[]> {
  const findings: Finding[] = [];
  let current = '';

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    // A 404 page's own document is reported by Chromium as a failed resource.
    const location = message.location().url;
    const expected = list.find((route) => route.path === current)?.status === 404;
    if (expected && location === new URL(current, origin).href) return;
    findings.push({ check: 'console', path: current, detail: message.text().slice(0, 300) });
  });
  page.on('pageerror', (error) => {
    // WebKit's word for the same cancelled prefetch (see requestfailed below):
    // it rejects the fetch with an access-control error, for this origin's own
    // RSC payload, when the walk navigates away mid-request.
    if (/due to access control checks/.test(error.message) && error.message.includes(`${new URL(origin).host}/`) && error.message.includes('_rsc=')) return;
    findings.push({ check: 'console', path: current, detail: `uncaught: ${error.message.slice(0, 300)}` });
  });
  page.on('requestfailed', (request) => {
    const url = new URL(request.url());
    if (url.origin !== origin) return;
    // Navigating on to the next route cancels whatever the last one was still
    // prefetching; that is the walk's doing, not the page's. Each engine words
    // a cancel its own way.
    if (/ERR_ABORTED|cancelled|NS_BINDING_ABORTED/i.test(request.failure()?.errorText ?? '')) return;
    findings.push({ check: 'requests', path: current, detail: `${request.method()} ${url.pathname}: ${request.failure()?.errorText}` });
  });
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin !== origin) return;
    if (response.status() < 400) return;
    if (response.request().isNavigationRequest()) return;
    findings.push({ check: 'requests', path: current, detail: `${response.status()} ${url.pathname}` });
  });

  for (const route of list) {
    current = route.path;
    const response = await page.goto(new URL(route.path, origin).href, { waitUntil: 'load' });
    const status = response?.status() ?? 0;
    if (status !== route.status) {
      findings.push({ check: 'status', path: route.path, detail: `answered ${status}, expected ${route.status}` });
    }
    // Past hydration, the mode read off the query, and the font swap, any of
    // which can move the layout or log an error.
    await page.evaluate(
      () =>
        document.fonts.ready.then(
          // Safari has no requestIdleCallback.
          () =>
            new Promise((resolve) =>
              'requestIdleCallback' in window
                ? requestIdleCallback(() => resolve(null), { timeout: 1000 })
                : setTimeout(() => resolve(null), 300),
            ),
        ),
    );

    const found = await page.evaluate(inspect);
    if (found.scrollWidth > found.clientWidth) {
      findings.push({ check: 'overflow', path: route.path, detail: `scrollWidth ${found.scrollWidth} > clientWidth ${found.clientWidth}` });
    }
    if (found.h1s !== 1) findings.push({ check: 'h1', path: route.path, detail: `${found.h1s} h1 elements` });
    for (const detail of found.skipped) findings.push({ check: 'headings', path: route.path, detail });
    for (const detail of found.missingAlt) findings.push({ check: 'alt', path: route.path, detail });
    for (const detail of found.small) findings.push({ check: 'targets', path: route.path, detail });
  }
  return findings;
}

const CHECKS: Check[] = ['status', 'overflow', 'console', 'requests', 'h1', 'headings', 'alt', 'targets'];

for (const { width, height, label } of WIDTHS) {
  test(`every route at ${width}px${label ? ` (${label})` : ''}`, async ({ browser, request, baseURL }) => {
    test.slow();
    const list = await routes(request);
    const context = await browser.newContext({ viewport: { width, height } });
    const findings = (await walk(await context.newPage(), baseURL!, list)).filter(
      (finding) => !isKnown(finding, width),
    );
    await context.close();

    for (const check of CHECKS) {
      const failed = findings.filter((finding) => finding.check === check);
      expect.soft(failed.map((finding) => `${finding.path}: ${finding.detail}`), `${check} at ${width}px`).toEqual([]);
    }
  });
}

for (const bug of KNOWN) {
  test.fixme(`${bug.path}: ${bug.reason}`, async ({ browser, request, baseURL }) => {
    const route = (await routes(request)).find((candidate) => candidate.path === bug.path);
    expect(route, `${bug.path} is no longer a route`).toBeTruthy();
    for (const { width, height } of WIDTHS.filter((entry) => !bug.widths || bug.widths.includes(entry.width))) {
      const context = await browser.newContext({ viewport: { width, height } });
      const findings = await walk(await context.newPage(), baseURL!, [route!]);
      await context.close();
      expect.soft(findings.filter((finding) => finding.check === bug.check), `at ${width}px`).toEqual([]);
    }
  });
}
