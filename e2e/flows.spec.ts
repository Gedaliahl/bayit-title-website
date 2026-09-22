// The things a reader does, end to end in a real browser: the phone menu, the
// estimator in both of its figure modes, the three forms and the two upload
// boxes.
//
// Nothing here talks to a county roll, to Supabase or to storage. The API
// routes are answered with page.route, which is what lets a test say exactly
// how slow, how wrong or how absent an answer is. The route handlers
// themselves are covered in tests/.
//
// Expected totals come from lib/closing-estimate.ts, called from here with
// the inputs the test typed, rather than from figures copied off the page.
// The server is built without Supabase, as CI builds it, so every county
// carries a null owner's-policy custom and the estimate is called with the
// same.
import { expect, test, type Page, type Request, type Route } from '@playwright/test';

import { ACTIONS, FORM, UPLOAD } from '@/content/estimate';
import { DEFAULTS, estimate, pagesToPrice, type EstimateInput } from '@/lib/closing-estimate';
import { ACCEPTED_LABEL, MAX_FILES, MAX_FILE_BYTES, formatBytes } from '@/lib/documents';
import { site } from '@/lib/site';
import { formatCents } from '@/lib/statutory-rates';

/** What the numbers mode prices a given set of inputs at, as the page would. */
function expectedTotal(overrides: Partial<EstimateInput>): string {
  const input = { ...DEFAULTS, ownerPolicyCustom: null, ...overrides };
  return formatCents(
    estimate({
      ...input,
      deedPages: pagesToPrice(input.deedPages),
      mortgagePages: pagesToPrice(input.mortgagePages),
    }).total,
  );
}

const pdf = (name: string, bytes = 2048) => ({
  name,
  mimeType: 'application/pdf',
  buffer: Buffer.alloc(bytes, 0x25),
});

function json(route: Route, status: number, body: unknown) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

/** A platform error page: the handler never ran, so nobody knows whether the submission landed. */
function platformError(route: Route) {
  return route.fulfill({ status: 500, contentType: 'text/html', body: '<h1>Internal Server Error</h1>' });
}

// ---------------------------------------------------------------------------
// The phone menu

test.describe('the menu on a phone @smoke', () => {
  test.use({ viewport: { width: 375, height: 740 } });

  const toggle = (page: Page) => page.getByRole('button', { name: 'Menu' });
  const nav = (page: Page) => page.getByRole('navigation', { name: 'Primary' });

  test('opens, and Escape closes it and gives focus back to the button', async ({ page }) => {
    await page.goto('/about');
    await expect(nav(page).getByRole('link', { name: 'Counties' })).toBeHidden();

    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(nav(page).getByRole('link', { name: 'Counties' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(nav(page).getByRole('link', { name: 'Counties' })).toBeHidden();
    await expect(toggle(page)).toBeFocused();
  });

  test('leaves Escape to a field further down the page', async ({ page }) => {
    await page.goto('/estimate?mode=numbers');
    await toggle(page).click();
    const price = page.getByLabel(FORM.price.label, { exact: true });
    await price.focus();
    await page.keyboard.press('Escape');
    await expect(price).toBeFocused();
  });

  test('closes when a link in it is followed', async ({ page }) => {
    await page.goto('/about');
    await toggle(page).click();
    await nav(page).getByRole('link', { name: 'Counties' }).click();
    await expect(page).toHaveURL(/\/counties$/);
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
  });

  // The nav's own Estimate link leaves /estimate?mode=… on the same path, so
  // the route-change check never sees it; the click handler has to close it.
  test('closes on a link to the page already open', async ({ page }) => {
    await page.goto('/estimate?mode=upload');
    await toggle(page).click();
    await nav(page).getByRole('link', { name: 'Estimate' }).click();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#main')).toBeFocused();
  });
});

// ---------------------------------------------------------------------------
// The estimator, from the contract numbers

test.describe('the estimator from the numbers', () => {
  const total = (page: Page) => page.locator('#estimate-figures .figure-card__total');
  const price = (page: Page) => page.getByLabel(FORM.price.label, { exact: true });
  const loan = (page: Page) => page.getByLabel(FORM.loan.label, { exact: true });

  async function openNumbers(page: Page) {
    await page.goto('/estimate?mode=numbers');
    await expect(price(page)).toBeVisible();
  }

  async function typeMoney(page: Page, field: ReturnType<typeof price>, text: string) {
    await field.click();
    await field.press('ControlOrMeta+a');
    await field.press('Backspace');
    await field.pressSequentially(text);
    await field.blur();
  }

  test('opens on the defaults @smoke', async ({ page }) => {
    await openNumbers(page);
    await expect(price(page)).toHaveValue('500,000');
    await expect(total(page)).toHaveText(expectedTotal({}));
  });

  test('reads "450,000.00" as $450,000, not as 45 million', async ({ page }) => {
    await openNumbers(page);
    await typeMoney(page, price(page), '450,000.00');
    await expect(price(page)).toHaveValue('450,000');
    await expect(total(page)).toHaveText(expectedTotal({ price: 450_000 }));
  });

  const cases: { name: string; purpose: 'purchase' | 'refinance'; price?: number; loan: number }[] = [
    { name: 'a Broward purchase, buyer side', purpose: 'purchase', price: 450_000, loan: 360_000 },
    { name: 'a Broward cash purchase, buyer side', purpose: 'purchase', price: 725_000, loan: 0 },
    { name: 'a Broward refinance', purpose: 'refinance', loan: 300_000 },
  ];

  for (const entry of cases) {
    test(`totals ${entry.name}`, async ({ page }) => {
      await openNumbers(page);
      if (entry.purpose === 'refinance') {
        await page.getByRole('radio', { name: FORM.transaction.refinance }).check();
        await expect(price(page)).toBeHidden();
      }
      if (entry.price !== undefined) await typeMoney(page, price(page), String(entry.price));
      await typeMoney(page, loan(page), String(entry.loan));

      await expect(total(page)).toHaveText(
        expectedTotal({
          transaction: entry.purpose,
          ...(entry.price !== undefined ? { price: entry.price } : {}),
          loanAmount: entry.loan,
        }),
      );
    });
  }

  test('Backspace on a comma takes the digit before it, and a refused key leaves the caret', async ({ page }) => {
    await openNumbers(page);
    const field = price(page);
    await field.click();
    // "500,000" with the caret just after the comma.
    await field.evaluate((input: HTMLInputElement) => input.setSelectionRange(4, 4));
    await page.keyboard.press('Backspace');
    await expect(field).toHaveValue('50,000');

    await field.evaluate((input: HTMLInputElement) => input.setSelectionRange(2, 2));
    await page.keyboard.type('x');
    await expect(field).toHaveValue('50,000');
    expect(await field.evaluate((input: HTMLInputElement) => input.selectionStart)).toBe(2);
    await expect(page.getByText(FORM.money.characters)).toBeVisible();

    await field.blur();
    await expect(page.getByText(FORM.money.characters)).toBeHidden();
  });

  test('keeps the address bar in step with the boxes after Back past an in-page link', async ({ page }) => {
    await openNumbers(page);
    await typeMoney(page, price(page), '600,000');
    await expect(page).toHaveURL(/price=600000/);
    await page.getByRole('link', { name: FORM.reissue.link }).click();
    await expect(page).toHaveURL(/#reissue$/);
    await typeMoney(page, price(page), '700,000');
    await page.goBack();
    await expect(price(page)).toHaveValue('700,000');
    await expect(page).toHaveURL(/price=700000/);
  });

  test('keeps the figures in the address bar through a reload', async ({ page }) => {
    await openNumbers(page);
    await typeMoney(page, price(page), '612,500');
    await typeMoney(page, loan(page), '490,000');
    await page.getByRole('radio', { name: FORM.party.seller }).check();
    const shown = expectedTotal({ price: 612_500, loanAmount: 490_000, party: 'seller' });
    await expect(total(page)).toHaveText(shown);

    // The query is written a moment after the last change.
    await expect(page).toHaveURL(/612500/);
    await page.reload();

    await expect(price(page)).toHaveValue('612,500');
    await expect(page.getByRole('radio', { name: FORM.party.seller })).toBeChecked();
    await expect(total(page)).toHaveText(shown);
  });

  test('Start again puts every default back', async ({ page }) => {
    await openNumbers(page);
    await page.getByRole('radio', { name: FORM.transaction.refinance }).check();
    await typeMoney(page, loan(page), '123,000');
    await page.getByRole('button', { name: ACTIONS.reset }).click();

    await expect(page.getByRole('radio', { name: FORM.transaction.purchase })).toBeChecked();
    await expect(price(page)).toHaveValue('500,000');
    await expect(loan(page)).toHaveValue('400,000');
    await expect(total(page)).toHaveText(expectedTotal({}));
  });

  test('the radio groups work from the keyboard alone', async ({ page }) => {
    await openNumbers(page);
    const purchase = page.getByRole('radio', { name: FORM.transaction.purchase });
    const refinance = page.getByRole('radio', { name: FORM.transaction.refinance });

    await purchase.focus();
    await page.keyboard.press('ArrowRight');
    await expect(refinance).toBeChecked();
    await expect(refinance).toBeFocused();
    await expect(price(page)).toBeHidden();

    await page.keyboard.press('ArrowLeft');
    await expect(purchase).toBeChecked();

    // Tab leaves a radio group in one stop, onto the next group's checked radio.
    await page.keyboard.press('Tab');
    const buyer = page.getByRole('radio', { name: FORM.party.buyer });
    await expect(buyer).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('radio', { name: FORM.party.seller })).toBeChecked();
    await expect(total(page)).toHaveText(expectedTotal({ party: 'seller' }));
  });
});

test('the masthead’s Estimate link from the contract option opens the address option', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/estimate?mode=upload');
  await expect(page.getByRole('combobox', { name: FORM.address.label })).toBeHidden();
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Estimate' }).click();
  await expect(page).toHaveURL(/\/estimate$/);
  await expect(page.getByRole('combobox', { name: FORM.address.label })).toBeVisible();
});

// ---------------------------------------------------------------------------
// The estimator, from an address

test.describe('the estimator from an address', () => {
  const box = (page: Page) => page.getByRole('combobox', { name: FORM.address.label });
  const value = (page: Page) => page.getByLabel(FORM.assessed.label, { exact: true });

  function suggestion(id: string, address: string) {
    return {
      id,
      address,
      city: 'Fort Lauderdale',
      zip: '33301',
      countySlug: 'broward-county',
      countyName: 'Broward County',
      parcelId: `P-${id}`,
      assessedValue: null,
      justValue: null,
      rollYear: null,
      useDescription: null,
      homestead: null,
      lastSale: null,
      sourceName: 'Florida statewide parcels',
      sourceUrl: 'https://example.com/parcels',
      valueLookup: { kind: 'point', lat: 26.1, lon: -80.1 },
      lookupToken: `token-${id}`,
    };
  }

  function found(address: string, justValue: number) {
    return {
      status: 'found',
      value: {
        address,
        countySlug: 'broward-county',
        countyName: 'Broward County',
        parcelId: 'P',
        assessedValue: justValue - 50_000,
        justValue,
        rollYear: 2026,
        homestead: null,
        lastSale: null,
        sourceName: 'Florida statewide parcels',
        sourceUrl: 'https://example.com/parcels',
      },
    };
  }

  async function search(page: Page, text: string) {
    await box(page).fill(text);
    await expect(page.getByRole('listbox', { name: FORM.address.listLabel })).toBeVisible();
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/estimate');
    await expect(box(page)).toBeVisible();
  });

  test('a slow first lookup cannot overwrite the property picked after it', async ({ page }) => {
    const slow = suggestion('a', '100 Slow Ave');
    const fast = suggestion('b', '200 Fast St');

    await page.route('/api/property-search', (route) => {
      const q = (route.request().postDataJSON() as { q: string }).q;
      return json(route, 200, { status: 'ok', suggestions: q.startsWith('100') ? [slow] : [fast] });
    });
    let slowAnswered: () => void = () => {};
    const slowDone = new Promise<void>((resolve) => (slowAnswered = resolve));
    await page.route('/api/parcel-value', async (route) => {
      const address = (route.request().postDataJSON() as { address: string }).address;
      if (address === slow.address) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        // Typing the second address aborts this request, so there may be
        // nobody left to answer.
        await json(route, 200, found(slow.address, 111_111)).catch(() => {});
        slowAnswered();
        return;
      }
      await json(route, 200, found(fast.address, 222_222));
    });

    await search(page, '100 Slow');
    await page.getByRole('option', { name: /100 Slow Ave/ }).click();
    await expect(page.getByText(FORM.assessed.reading)).toBeVisible();

    await search(page, '200 Fast');
    await page.getByRole('option', { name: /200 Fast St/ }).click();
    await expect(value(page)).toHaveValue('222,222');

    await slowDone;
    // Long enough for a late answer to have been applied, had it been going to be.
    await page.waitForTimeout(300);
    await expect(value(page)).toHaveValue('222,222');
    await expect(box(page)).toHaveValue(/200 Fast St/);
  });

  test('a second property picked carries nothing of the first one’s value', async ({ page }) => {
    const first = suggestion('d', '400 First Ave');
    const second = suggestion('e', '500 Second St');
    await page.route('/api/property-search', (route) => {
      const q = (route.request().postDataJSON() as { q: string }).q;
      return json(route, 200, { status: 'ok', suggestions: q.startsWith('400') ? [first] : [second] });
    });
    await page.route('/api/parcel-value', (route) => {
      const address = (route.request().postDataJSON() as { address: string }).address;
      return address === first.address
        ? json(route, 200, found(first.address, 333_333))
        : json(route, 200, { status: 'declined', reason: 'mismatch' });
    });

    await search(page, '400 First');
    await page.getByRole('option', { name: /400 First Ave/ }).click();
    await expect(value(page)).toHaveValue('333,333');

    await search(page, '500 Second');
    await page.getByRole('option', { name: /500 Second St/ }).click();
    await expect(page.getByText(FORM.assessed.missed.declined)).toBeVisible();
    await expect(value(page)).toHaveValue('');
  });

  test('the county hint stops naming the parcel once another county is chosen', async ({ page }) => {
    const picked = suggestion('f', '600 County Rd');
    await page.route('/api/property-search', (route) => json(route, 200, { status: 'ok', suggestions: [picked] }));
    await page.route('/api/parcel-value', (route) => json(route, 200, found(picked.address, 250_000)));

    await search(page, '600 County');
    await page.getByRole('option', { name: /600 County Rd/ }).click();
    const fromParcel = page.getByText(FORM.county.fromParcel('Broward County'));
    await expect(fromParcel).toBeVisible();

    await page.getByLabel(FORM.county.label, { exact: true }).selectOption('palm-beach-county');
    await expect(fromParcel).toBeHidden();
  });

  const searchFailures: { name: string; answer: (route: Route) => Promise<void>; says: string }[] = [
    { name: 'rate-limited', answer: (route) => json(route, 429, { error: 'slow down' }), says: FORM.address.rateLimited },
    { name: 'unavailable', answer: (route) => json(route, 200, { status: 'unavailable', suggestions: [] }), says: FORM.address.unavailable },
    { name: 'a server error', answer: (route) => platformError(route), says: FORM.address.unavailable },
    { name: 'outside Florida', answer: (route) => json(route, 200, { status: 'outside-florida', suggestions: [] }), says: FORM.address.floridaOnly },
  ];

  for (const failure of searchFailures) {
    test(`the search says so when it is ${failure.name}`, async ({ page }) => {
      await page.route('/api/property-search', failure.answer);
      await box(page).fill('1409 NW 48th St');
      await expect(page.getByText(failure.says)).toBeVisible();
    });
  }

  const valueFailures: { name: string; answer: (route: Route) => Promise<void>; says: string }[] = [
    { name: 'declined', answer: (route) => json(route, 200, { status: 'declined', reason: 'mismatch' }), says: FORM.assessed.missed.declined },
    { name: 'one unit of many', answer: (route) => json(route, 200, { status: 'declined', reason: 'which-unit' }), says: FORM.assessed.missed['which-unit'] },
    { name: 'unavailable', answer: (route) => json(route, 200, { status: 'unavailable' }), says: FORM.assessed.missed.unavailable },
    { name: 'rate-limited', answer: (route) => json(route, 429, { error: 'slow down' }), says: FORM.assessed.missed['rate-limited'] },
    { name: 'expired', answer: (route) => json(route, 200, { status: 'expired' }), says: FORM.assessed.missed.expired },
  ];

  for (const failure of valueFailures) {
    test(`a picked property says so when its value is ${failure.name}`, async ({ page }) => {
      await page.route('/api/property-search', (route) =>
        json(route, 200, { status: 'ok', suggestions: [suggestion('c', '300 Condo Way')] }),
      );
      await page.route('/api/parcel-value', failure.answer);
      await search(page, '300 Condo');
      await page.getByRole('option', { name: /300 Condo Way/ }).click();
      await expect(page.getByText(failure.says)).toBeVisible();
      await expect(value(page)).toHaveValue('');
    });
  }
});

// ---------------------------------------------------------------------------
// The forms

/** No answer, or an answer our own handler did not write: it may have landed, so ring first. */
const NO_ANSWER = new RegExp(`cannot tell whether .*Call ${site.phoneDisplay.replaceAll('.', '\\.')} .*before sending it again`);

interface FormCase {
  path: string;
  endpoint: string;
  submit: string;
  success: RegExp;
  noAnswer: RegExp;
  fill: (page: Page) => Promise<void>;
  /** A field the server can reject, and the id focus should land on. */
  invalid: { field: string; message: string };
  created: unknown;
}

const FORMS: FormCase[] = [
  {
    path: '/contact',
    endpoint: '/api/leads',
    submit: 'Send',
    success: /^Received\./,
    noAnswer: NO_ANSWER,
    fill: async (page) => {
      await page.getByLabel('Your name').fill('Dana Reader');
      await page.getByLabel('Email', { exact: true }).fill('dana@example.com');
      await page.getByLabel('What do you need?').fill('A question about a closing.');
    },
    invalid: { field: 'email', message: 'Enter an email we can reply to.' },
    created: { ok: true, id: 'lead-1' },
  },
  {
    path: '/quote',
    endpoint: '/api/leads',
    submit: 'Request the quote',
    success: /^Received\./,
    noAnswer: NO_ANSWER,
    fill: async (page) => {
      await page.getByLabel('Your name').fill('Dana Reader');
      await page.getByLabel('Email', { exact: true }).fill('dana@example.com');
      await page.getByLabel('Property address').fill('1409 NW 48th St, Boca Raton 33431');
    },
    invalid: { field: 'email', message: 'Enter an email we can reply to.' },
    created: { ok: true, id: 'lead-2' },
  },
  {
    path: '/order',
    endpoint: '/api/orders',
    submit: 'Open the order',
    success: /^Order received — BT-2026-0001\.$/,
    noAnswer: NO_ANSWER,
    fill: async (page) => {
      await page.getByLabel('Your name').fill('Dana Reader');
      await page.getByLabel('Email', { exact: true }).fill('dana@example.com');
      await page.getByLabel('Property address').fill('1409 NW 48th St, Boca Raton 33431');
    },
    invalid: { field: 'ordered_by_email', message: 'Enter an email we can send the commitment to.' },
    created: { ok: true, reference: 'BT-2026-0001', order_id: 'order-1', uploads: [] },
  },
];

for (const form of FORMS) {
  test.describe(`the form on ${form.path}`, () => {
    const button = (page: Page) => page.getByRole('button', { name: form.submit, exact: true });
    // Not getByRole('alert'): Next's route announcer is an empty alert on every page.
    const failure = (page: Page) => page.locator('form [role="alert"]');

    test.beforeEach(async ({ page }) => {
      await page.goto(form.path);
      await form.fill(page);
    });

    test(`a success puts focus on the confirmation${form.path === '/order' ? ' @smoke' : ''}`, async ({ page }) => {
      await page.route(form.endpoint, (route) => json(route, 201, form.created));
      await button(page).click();
      const focused = page.locator(':focus');
      await expect(focused).toHaveText(form.success);
    });

    test('a 422 marks the field the server refused and focuses it', async ({ page }) => {
      await page.route(form.endpoint, (route) =>
        json(route, 422, { errors: { [form.invalid.field]: form.invalid.message } }),
      );
      await button(page).click();
      const field = page.locator(`#${form.invalid.field}`);
      await expect(field).toHaveAttribute('aria-invalid', 'true');
      await expect(page.locator(`#${form.invalid.field}-error`)).toHaveText(form.invalid.message);
      // The order form has an error summary, which takes focus so a long
      // form's reader hears every problem; the short forms go to the field.
      if (form.path === '/order') {
        await expect(page.locator('.error-summary')).toBeFocused();
        await expect(page.locator('.error-summary')).toContainText(form.invalid.message);
      } else {
        await expect(field).toBeFocused();
      }
    });

    test('a 429 says what the server said', async ({ page }) => {
      const message = `That is more requests than we can take in an hour. Call ${site.phoneDisplay}.`;
      await page.route(form.endpoint, (route) => json(route, 429, { error: message }));
      await button(page).click();
      await expect(failure(page)).toHaveText(message);
      await expect(failure(page)).toBeFocused();
    });

    test('a 500 from the platform says to call before sending again', async ({ page }) => {
      await page.route(form.endpoint, platformError);
      await button(page).click();
      await expect(failure(page)).toHaveText(form.noAnswer);
    });

    test('a network timeout says to call before sending again', async ({ page }) => {
      await page.route(form.endpoint, (route) => route.abort('timedout'));
      await button(page).click();
      await expect(failure(page)).toHaveText(form.noAnswer);
    });

    test('a double click sends it once', async ({ page }) => {
      const sent: Request[] = [];
      await page.route(form.endpoint, async (route) => {
        sent.push(route.request());
        await new Promise((resolve) => setTimeout(resolve, 800));
        await json(route, 201, form.created);
      });
      await button(page).dblclick();
      await expect(page.locator(':focus')).toHaveText(form.success);
      expect(sent).toHaveLength(1);
    });

    if (form.path !== '/contact') {
      test('an untouched County select is sent as no county', async ({ page }) => {
        let body: Record<string, unknown> = {};
        await page.route(form.endpoint, (route) => {
          body = route.request().postDataJSON();
          return json(route, 201, form.created);
        });
        await expect(page.getByLabel('County')).toHaveValue('');
        await button(page).click();
        await expect(page.locator(':focus')).toHaveText(form.success);
        expect(body.county_slug ?? null).toBeNull();
      });
    }
  });
}

// ---------------------------------------------------------------------------
// The upload boxes

const UPLOADS = [
  {
    name: 'the contract on /estimate',
    path: '/estimate?mode=upload',
    input: '#estimator-upload input[type="file"]',
    typeLabel: UPLOAD.contract.typeLabel,
  },
  {
    name: 'the documents on /order',
    path: '/order',
    input: 'input[type="file"][name="documents"]',
    typeLabel: ACCEPTED_LABEL,
  },
];

for (const box of UPLOADS) {
  test.describe(`uploading ${box.name}`, () => {
    const rejected = (page: Page) => page.locator('.file-rejects__list li');

    test.beforeEach(async ({ page }) => {
      await page.goto(box.path);
      await expect(page.locator(box.input)).toBeAttached();
    });

    test('a file over the size limit is listed with the reason', async ({ page }) => {
      await page.locator(box.input).setInputFiles([pdf('survey.pdf', MAX_FILE_BYTES + 1)]);
      await expect(rejected(page)).toHaveText([`survey.pdf — over ${formatBytes(MAX_FILE_BYTES)}`]);
    });

    test('the wrong type is listed, and the good file in the same batch is kept', async ({ page }) => {
      await page.locator(box.input).setInputFiles([
        pdf('contract.pdf'),
        { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('notes') },
      ]);
      await expect(rejected(page)).toHaveText([`notes.txt — ${box.typeLabel} only`]);
      await expect(page.locator('.file-list__name, .contract-files__name')).toHaveText(['contract.pdf']);
    });

    test('files past the count limit are listed', async ({ page }) => {
      const files = Array.from({ length: MAX_FILES + 2 }, (_, index) => pdf(`page-${index + 1}.pdf`, 1024));
      await page.locator(box.input).setInputFiles(files);
      await expect(rejected(page)).toHaveText([
        `page-${MAX_FILES + 1}.pdf — no more than ${MAX_FILES} files`,
        `page-${MAX_FILES + 2}.pdf — no more than ${MAX_FILES} files`,
      ]);
    });

    test('removing a file puts focus on the next one, and then on the picker', async ({ page }) => {
      await page.locator(box.input).setInputFiles([pdf('a.pdf'), pdf('b.pdf')]);
      const removeButtons = page.locator('.file-list__remove, .contract-files__remove');
      await removeButtons.first().click();
      await expect(removeButtons).toHaveCount(1);
      await expect(removeButtons.first()).toBeFocused();
      await removeButtons.first().click();
      await expect(page.locator(box.input)).toBeFocused();
    });

    test('the same file picked twice is listed as a duplicate', async ({ page }) => {
      await page.locator(box.input).setInputFiles([pdf('contract.pdf')]);
      await page.locator(box.input).setInputFiles([pdf('contract.pdf')]);
      await expect(rejected(page)).toHaveText(['contract.pdf — already added']);
    });
  });
}

test('an order whose second upload fails is still received, and names the file', async ({ page }) => {
  await page.goto('/order');
  await FORMS[2]!.fill(page);
  await page.locator('input[type="file"][name="documents"]').setInputFiles([pdf('contract.pdf'), pdf('survey.pdf')]);

  // Signed upload URLs on this origin, so the page's own CSP lets them through.
  await page.route('/api/orders', (route) =>
    json(route, 201, {
      ok: true,
      reference: 'BT-2026-0002',
      order_id: 'order-2',
      uploads: [
        { index: 0, name: 'contract.pdf', path: 'order-2/contract.pdf', contentType: 'application/pdf', url: '/e2e-upload/0' },
        { index: 1, name: 'survey.pdf', path: 'order-2/survey.pdf', contentType: 'application/pdf', url: '/e2e-upload/1' },
      ],
    }),
  );
  await page.route('/e2e-upload/0', (route) => route.fulfill({ status: 200, body: '' }));
  await page.route('/e2e-upload/1', (route) => route.fulfill({ status: 500, body: '' }));
  await page.route('/api/orders/documents', (route) => json(route, 200, { recorded: 1, rejected: [] }));

  await page.getByRole('button', { name: 'Open the order' }).click();
  await expect(page.locator(':focus')).toHaveText('Order received — BT-2026-0002.');
  await expect(page.getByText('1 document attached to the file.')).toBeVisible();
  await expect(page.locator('.form-status__list li')).toHaveText(['survey.pdf — the upload failed']);
});

// ---------------------------------------------------------------------------
// The homepage's moving parts

test.describe('what moves on the homepage', () => {
  test('the pause switches stop the ticker and the example file', async ({ page }) => {
    await page.goto('/');
    const tickerSwitch = page.getByRole('checkbox', { name: 'Pause the moving list of what we close' });
    const fileSwitch = page.getByRole('checkbox', { name: 'Pause the example file' });

    await tickerSwitch.check();
    await fileSwitch.check();
    const state = await page.evaluate(() => ({
      ticker: getComputedStyle(document.querySelector('.ticker__track')!).animationPlayState,
      file: getComputedStyle(document.querySelector('.filestep__disc')!).animationPlayState,
    }));
    expect(state).toEqual({ ticker: 'paused', file: 'paused' });

    await tickerSwitch.uncheck();
    // The click leaves the pointer on the band, which holds it still by design.
    await page.mouse.move(0, 0);
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.querySelector('.ticker__track')!).animationPlayState))
      .toBe('running');
  });

  test('offers no pause switch to a reader who has asked for less motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.getByRole('checkbox', { name: 'Pause the example file' })).toBeHidden();
  });

  test('gives a screen reader the final figures, not the count', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.figure__value .visually-hidden').first()).toHaveText(String(site.floridaCounties));
  });
});
