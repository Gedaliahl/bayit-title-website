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
