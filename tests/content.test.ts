/**
 * The publishing gate in lib/content.ts.
 *
 * This is the rule the repository exists to enforce: a page cannot claim a
 * licensed review while it still contains unresolved facts, and an unreviewed
 * draft cannot reach the public site. Both are enforced by throwing during the
 * build, which means a refactor could quietly weaken them and every build would
 * still pass. These tests are the thing that notices.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalCwd = process.cwd();
let fixtureRoot: string;

/** A body long enough to clear the 40-60 word direct answer floor. */
const ANSWER =
  'A municipal lien search and a title search are different searches that find ' +
  'different things, and a Florida closing usually needs both before the file ' +
  'can be cleared to close on the date in the contract itself.';

interface FixtureOptions {
  status?: string;
  slug?: string;
  direct_answer?: string;
  body?: string;
  extra?: string;
}

function writeDoc(filename: string, options: FixtureOptions = {}): void {
  const {
    status = 'draft',
    slug = filename,
    direct_answer = ANSWER,
    body = '## What happens next?\n\nSomething specific.\n',
    extra = '',
  } = options;

  const frontMatter = [
    '---',
    `status: ${status}`,
    'title: "A question in the reader\'s words"',
    `slug: "${slug}"`,
    'cluster: "liens"',
    `direct_answer: "${direct_answer}"`,
    'counties: ["broward-county"]',
    'related: []',
    extra,
    '---',
    '',
  ]
    .filter((line) => line !== '')
    .join('\n');

  fs.writeFileSync(path.join(fixtureRoot, 'content', 'title-problems', `${filename}.md`), `${frontMatter}\n${body}`);
}

/**
 * CONTENT_ROOT and SHOW_DRAFTS are both resolved when the module first loads,
 * so each test needs a fresh copy pointed at its own fixture tree.
 */
async function loadContentModule() {
  vi.resetModules();
  process.chdir(fixtureRoot);
  return import('@/lib/content');
}

beforeEach(() => {
  fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bayit-content-'));
  fs.mkdirSync(path.join(fixtureRoot, 'content', 'title-problems'), { recursive: true });
  vi.stubEnv('SHOW_DRAFTS', '');
  vi.stubEnv('VERCEL_ENV', '');
});

afterEach(() => {
  process.chdir(originalCwd);
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('the reviewed/VERIFY gate', () => {
  it('refuses a reviewed page that still carries a VERIFY flag', async () => {
    writeDoc('open-permits', {
      status: 'reviewed',
      extra: 'author: "shevy"\nreviewed_on: 2026-09-10\nnext_review: 2027-09-10',
      body: 'The statutory window is [VERIFY: ch. 718 deadline] days.\n',
    });

    const { getDoc } = await loadContentModule();
    await expect(getDoc('title-problems', 'open-permits')).rejects.toThrow(
      /status is "reviewed" but 1 VERIFY flag\(s\) remain.*ch\. 718 deadline/s,
    );
  });

  it('catches a flag hiding in the direct answer, not just the body', async () => {
    writeDoc('in-the-answer', {
      status: 'reviewed',
      extra: 'author: "shevy"\nreviewed_on: 2026-09-10\nnext_review: 2027-09-10',
      direct_answer: `${ANSWER} [VERIFY: the coverage position]`,
    });

    const { getDoc } = await loadContentModule();
    await expect(getDoc('title-problems', 'in-the-answer')).rejects.toThrow(/the coverage position/);
  });

  it('lets a draft carry its flags, and reports them', async () => {
    writeDoc('still-drafting', {
      body: 'Timelines are [VERIFY: county recording turnaround] and [VERIFY] unconfirmed.\n',
    });

    const { getDoc } = await loadContentModule();
    const doc = await getDoc('title-problems', 'still-drafting');

    expect(doc?.status).toBe('draft');
    // An unlabelled flag still counts — it is unresolved either way.
    expect(doc?.verifyFlags).toEqual(['county recording turnaround', 'unspecified']);
  });

  it('refuses a review that does not name its reviewer and dates', async () => {
    writeDoc('unsigned', { status: 'reviewed' });

    const { getDoc } = await loadContentModule();
    await expect(getDoc('title-problems', 'unsigned')).rejects.toThrow(
      /must name its reviewer and dates.*author.*reviewed_on.*next_review/s,
    );
  });

  it('accepts a reviewed page once the flags are resolved', async () => {
    writeDoc('clean', {
      status: 'reviewed',
      extra: 'author: "shevy"\nreviewed_on: 2026-09-10\nnext_review: 2027-09-10',
    });

    const { getDoc } = await loadContentModule();
    const doc = await getDoc('title-problems', 'clean');

    expect(doc?.status).toBe('reviewed');
    expect(doc?.verifyFlags).toEqual([]);
    expect(doc?.author).toBe('shevy');
  });
});

describe('front-matter validation', () => {
  it('refuses a slug that disagrees with its filename', async () => {
    writeDoc('on-disk', { slug: 'in-front-matter' });

    const { getDoc } = await loadContentModule();
    await expect(getDoc('title-problems', 'on-disk')).rejects.toThrow(
      /does not match its filename/,
    );
  });

  it('refuses a direct answer too short to stand alone', async () => {
    writeDoc('too-short', { direct_answer: 'It depends on the county.' });

    const { getDoc } = await loadContentModule();
    await expect(getDoc('title-problems', 'too-short')).rejects.toThrow(
      /direct_answer is 5 words/,
    );
  });

  it('refuses an unknown cluster', async () => {
    writeDoc('bad-cluster');
    const file = path.join(fixtureRoot, 'content', 'title-problems', 'bad-cluster.md');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('cluster: "liens"', 'cluster: "misc"'));

    const { getDoc } = await loadContentModule();
    await expect(getDoc('title-problems', 'bad-cluster')).rejects.toThrow(/unknown cluster "misc"/);
  });

  it('returns null for a slug with no file, rather than throwing', async () => {
    const { getDoc } = await loadContentModule();
    await expect(getDoc('title-problems', 'never-written')).resolves.toBeNull();
  });
});

describe('what gets a route', () => {
  it('gives a draft no route in production', async () => {
    writeDoc('a-draft');
    writeDoc('a-reviewed-page', {
      status: 'reviewed',
      extra: 'author: "shevy"\nreviewed_on: 2026-09-10\nnext_review: 2027-09-10',
    });

    vi.stubEnv('NODE_ENV', 'production');
    const { listRoutableSlugs, listSlugs } = await loadContentModule();

    expect(listSlugs('title-problems').sort()).toEqual(['a-draft', 'a-reviewed-page']);
    expect(listRoutableSlugs('title-problems')).toEqual(['a-reviewed-page']);
  });

  it('gives a draft a route on a preview build', async () => {
    writeDoc('a-draft');

    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SHOW_DRAFTS', '1');
    const { listRoutableSlugs } = await loadContentModule();

    expect(listRoutableSlugs('title-problems')).toEqual(['a-draft']);
  });

  it('keeps drafts out of the listing that feeds the sitemap', async () => {
    writeDoc('a-draft');
    writeDoc('a-reviewed-page', {
      status: 'reviewed',
      extra: 'author: "shevy"\nreviewed_on: 2026-09-10\nnext_review: 2027-09-10',
    });

    vi.stubEnv('NODE_ENV', 'production');
    const { getAllDocs } = await loadContentModule();

    expect((await getAllDocs('title-problems')).map((doc) => doc.slug)).toEqual(['a-reviewed-page']);
  });
});

describe('the verdict card', () => {
  it('turns front-matter pairs into rows and renders their Markdown', async () => {
    writeDoc('with-a-verdict', {
      extra: [
        'verdict:',
        '  headline: "Rarely — if it is found early."',
        '  short: "Rarely"',
        '  rows:',
        '    - [ "Who resolves it", "The seller, from proceeds" ]',
        '    - [ "Timeline", "See [§ 55.10](https://example.test/55.10)" ]',
      ].join('\n'),
    });

    const { getDoc } = await loadContentModule();
    const doc = await getDoc('title-problems', 'with-a-verdict');

    expect(doc?.verdict?.short).toBe('Rarely');
    expect(doc?.verdict?.rows[0]).toMatchObject({
      term: 'Who resolves it',
      detail: 'The seller, from proceeds',
    });
    // The statute citation is the point of the row, so it has to be a link by
    // the time it reaches the page rather than raw Markdown on screen.
    expect(doc?.verdict?.rows[1].html).toBe(
      'See <a href="https://example.test/55.10">§ 55.10</a>',
    );
  });

  it('counts a VERIFY flag written into the card', async () => {
    writeDoc('flagged-verdict', {
      extra: [
        'verdict:',
        '  short: "Rarely"',
        '  headline: "Rarely."',
        '  rows:',
        '    - [ "Timeline", "[VERIFY: how long a payoff takes]" ]',
      ].join('\n'),
    });

    const { getDoc } = await loadContentModule();
    const doc = await getDoc('title-problems', 'flagged-verdict');

    expect(doc?.verifyFlags).toEqual(['how long a payoff takes']);
  });

  it('refuses rows with no headline to cap them', async () => {
    writeDoc('capless', {
      extra: ['verdict:', '  short: "Rarely"', '  rows:', '    - [ "Timeline", "Days" ]'].join('\n'),
    });

    const { getDoc } = await loadContentModule();
    await expect(getDoc('title-problems', 'capless')).rejects.toThrow(
      /rows are set without a verdict.headline/,
    );
  });

  it('refuses a row that is not a term and a detail', async () => {
    writeDoc('half-a-row', {
      extra: ['verdict:', '  short: "Rarely"', '  headline: "Rarely."', '  rows:', '    - [ "Timeline" ]'].join('\n'),
    });

    const { getDoc } = await loadContentModule();
    await expect(getDoc('title-problems', 'half-a-row')).rejects.toThrow(
      /verdict.rows\[0\] must be a \[term, detail\] pair/,
    );
  });

  it('lets a page carry an index label with no card of its own', async () => {
    writeDoc('label-only', { extra: ['verdict:', '  short: "No"'].join('\n') });

    const { getDoc } = await loadContentModule();
    const doc = await getDoc('title-problems', 'label-only');

    expect(doc?.verdict).toEqual({ short: 'No', rows: [] });
  });
});

describe('splitting a body into sections', () => {
  it('gives every heading an anchor, and marks the two the template lays out', async () => {
    writeDoc('sectioned', {
      body: [
        '## Why does it matter?',
        '',
        'Because it does.',
        '',
        '## How Bayit Title handles this',
        '',
        'We ask in writing.',
        '',
        '## Common questions',
        '',
        '### Is it expensive?',
        '',
        'No.',
        '',
      ].join('\n'),
    });

    const { getDoc } = await loadContentModule();
    const doc = await getDoc('title-problems', 'sectioned');

    expect(doc?.sections.map((section) => [section.id, section.kind])).toEqual([
      ['why-does-it-matter', 'prose'],
      ['how-bayit-title-handles-this', 'practice'],
      ['common-questions', 'faq'],
    ]);
    expect(doc?.sections[0].html).toContain('<p>Because it does.</p>');
  });

  it('keeps a paragraph written above the first heading', async () => {
    writeDoc('with-a-lead', {
      body: 'Something up front.\n\n## The first heading\n\nAnd the rest.\n',
    });

    const { getDoc } = await loadContentModule();
    const doc = await getDoc('title-problems', 'with-a-lead');

    expect(doc?.sections[0].title).toBe('');
    expect(doc?.sections[0].html).toContain('Something up front.');
    expect(doc?.sections[1].id).toBe('the-first-heading');
  });

  it('numbers a second heading that slugifies the same way', async () => {
    writeDoc('twice-asked', {
      body: '## What now?\n\nOne.\n\n## What now?\n\nTwo.\n',
    });

    const { getDoc } = await loadContentModule();
    const doc = await getDoc('title-problems', 'twice-asked');

    expect(doc?.sections.map((section) => section.id)).toEqual(['what-now', 'what-now-2']);
  });

  it('slugifies a quoted heading without collapsing it to hyphens', async () => {
    writeDoc('quoted-heading', {
      body: '## “Don’t worry about it.”\n\nThat is not a status report.\n',
    });

    const { getDoc } = await loadContentModule();
    const doc = await getDoc('title-problems', 'quoted-heading');

    expect(doc?.sections[0].id).toBe('dont-worry-about-it');
  });
});
