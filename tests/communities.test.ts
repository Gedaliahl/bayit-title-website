/**
 * The publishing gate for community association pages, and the real pages in
 * content/communities held to it.
 *
 * A community page states what a recorded declaration says about a closing,
 * which is the same kind of claim a library page makes, so it carries the same
 * gate: no route in production until reviewed, and no review while a VERIFY
 * flag or an unconfirmed fact remains. It adds one rule of its own — pages link
 * to each other, and a reviewed page may not link to one that has no route.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalCwd = process.cwd();
let fixtureRoot: string;

const ANSWER =
  'Example Park is run by its own homeowners association, and a resale there needs the ' +
  'master estoppel and the association estoppel, with a capital contribution paid by the ' +
  'buyer at closing under an amendment recorded in the official records.';

const REVIEWED = 'author: "shevy"\nreviewed_on: 2026-09-10\nnext_review: 2027-09-10';

interface PageOptions {
  status?: string;
  kind?: string;
  slug?: string;
  body?: string;
  related?: string[];
  extra?: string;
}

function writePage(community: string, file: string, options: PageOptions = {}): void {
  const isMaster = file === 'index';
  const {
    status = 'draft',
    kind = isMaster ? 'master' : 'neighborhood',
    slug = isMaster ? community : file,
    body = '## What does a closing need?\n\nBoth estoppels.\n',
    related = [],
    extra = '',
  } = options;

  const frontMatter = [
    '---',
    `status: ${status}`,
    `kind: ${kind}`,
    `name: "${slug}"`,
    `title: "What ${slug} documents say"`,
    `slug: "${slug}"`,
    'association: "Example Association, Inc."',
    'association_type: "Chapter 720 homeowners\' association"',
    'county: "broward-county"',
    `direct_answer: "${ANSWER}"`,
    'documents_through: "2026-04-06"',
    'at_a_glance:',
    '  - ["Estoppels", "The master\'s and the association\'s"]',
    `related: ${JSON.stringify(related)}`,
    extra,
    '---',
    '',
  ]
    .filter((line) => line !== '')
    .join('\n');

  const dir = path.join(fixtureRoot, 'content', 'communities', community);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${file}.md`), `${frontMatter}\n${body}`);
}

async function load() {
  vi.resetModules();
  process.chdir(fixtureRoot);
  return import('@/lib/communities');
}

beforeEach(() => {
  fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bayit-communities-'));
  fs.mkdirSync(path.join(fixtureRoot, 'content'), { recursive: true });
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
  it('refuses a reviewed page with a VERIFY flag in the at-a-glance card', async () => {
    writePage('park', 'index', { status: 'reviewed', extra: REVIEWED });
    const file = path.join(fixtureRoot, 'content', 'communities', 'park', 'index.md');
    fs.writeFileSync(
      file,
      fs
        .readFileSync(file, 'utf8')
        .replace('"The master\'s and the association\'s"', '"[VERIFY: which estoppels]"'),
    );

    const { getCommunity } = await load();
    await expect(getCommunity('park')).rejects.toThrow(/1 VERIFY flag\(s\) remain.*which estoppels/s);
  });

  it('refuses a reviewed page with facts still pending confirmation', async () => {
    writePage('park', 'index', {
      status: 'reviewed',
      extra: `${REVIEWED}\npending_confirmation:\n  - "the manager's name"`,
    });

    const { getCommunity } = await load();
    await expect(getCommunity('park')).rejects.toThrow(/still unconfirmed: the manager's name/);
  });

  it('accepts a reviewed page once everything is resolved', async () => {
    writePage('park', 'index', { status: 'reviewed', extra: REVIEWED });

    const { getCommunity } = await load();
    const page = await getCommunity('park');
    expect(page?.status).toBe('reviewed');
    expect(page?.path).toBe('/communities/park');
    expect(page?.verifyFlags).toEqual([]);
  });
});

describe('front-matter validation', () => {
  it('refuses a Neighborhood file that calls itself the master', async () => {
    writePage('park', 'index');
    writePage('park', 'elm', { kind: 'master' });

    const { getCommunity } = await load();
    await expect(getCommunity('park', 'elm')).rejects.toThrow(/kind must be "neighborhood"/);
  });

  it('refuses a slug that disagrees with its file', async () => {
    writePage('park', 'index');
    writePage('park', 'elm', { slug: 'oak' });

    const { getCommunity } = await load();
    await expect(getCommunity('park', 'elm')).rejects.toThrow(/does not match its file/);
  });

  it('refuses a related Neighborhood that has no file', async () => {
    writePage('park', 'index');
    writePage('park', 'elm', { related: ['oak'] });

    const { getCommunity } = await load();
    await expect(getCommunity('park', 'elm')).rejects.toThrow(/related "oak" is not another Neighborhood/);
  });
});

describe('links between community pages', () => {
  it('refuses a link to a community page that has no file', async () => {
    writePage('park', 'index', { body: '## Where?\n\nSee [Oak](/communities/park/oak).\n' });

    const { getCommunity } = await load();
    await expect(getCommunity('park')).rejects.toThrow(/links to \/communities\/park\/oak, which has no file/);
  });

  it('refuses a reviewed page that links to a draft', async () => {
    writePage('park', 'index', {
      status: 'reviewed',
      extra: REVIEWED,
      body: '## Where?\n\nSee [Elm](/communities/park/elm#leasing).\n',
    });
    writePage('park', 'elm');

    const { getCommunity } = await load();
    await expect(getCommunity('park')).rejects.toThrow(/a reviewed page links to \/communities\/park\/elm/);
  });

  it('lets a draft link to a draft', async () => {
    writePage('park', 'index', { body: '## Where?\n\nSee [Elm](/communities/park/elm).\n' });
    writePage('park', 'elm');

    const { getCommunity } = await load();
    await expect(getCommunity('park')).resolves.toMatchObject({ slug: 'park' });
  });
});

describe('what gets a route', () => {
  it('gives drafts no route in production', async () => {
    writePage('park', 'index', { status: 'reviewed', extra: REVIEWED });
    writePage('park', 'elm', { status: 'reviewed', extra: REVIEWED });
    writePage('park', 'oak');

    vi.stubEnv('NODE_ENV', 'production');
    const { listRoutableCommunities, listRoutableNeighborhoods } = await load();

    expect(listRoutableCommunities()).toEqual(['park']);
    expect(listRoutableNeighborhoods()).toEqual([{ community: 'park', neighborhood: 'elm' }]);
  });

  it('gives a reviewed Neighborhood no route while its master page is a draft', async () => {
    writePage('park', 'index');
    writePage('park', 'elm', { status: 'reviewed', extra: REVIEWED });

    vi.stubEnv('NODE_ENV', 'production');
    const { listRoutableCommunities, listRoutableNeighborhoods } = await load();

    expect(listRoutableCommunities()).toEqual([]);
    expect(listRoutableNeighborhoods()).toEqual([]);
  });

  it('gives drafts a route on a preview build', async () => {
    writePage('park', 'index');
    writePage('park', 'elm');

    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SHOW_DRAFTS', '1');
    const { listRoutableNeighborhoods } = await load();

    expect(listRoutableNeighborhoods()).toEqual([{ community: 'park', neighborhood: 'elm' }]);
  });
});

describe('the pages in content/communities', () => {
  const root = path.join(originalCwd, 'content', 'communities');
  const files = fs.existsSync(root)
    ? fs.readdirSync(root).flatMap((community) =>
        fs
          .readdirSync(path.join(root, community))
          .filter((file) => file.endsWith('.md'))
          .map((file) => [community, file.replace(/\.md$/, '')] as const),
      )
    : [];

  it.each(files)('%s/%s loads', async (community, file) => {
    process.chdir(originalCwd);
    vi.resetModules();
    const { getCommunity } = await import('@/lib/communities');
    const page = await getCommunity(community, file === 'index' ? community : file);
    expect(page).not.toBeNull();
    // The card beside the headline is written at the length a closer scans.
    expect(page!.at_a_glance.length).toBeLessThanOrEqual(8);
  });
});
