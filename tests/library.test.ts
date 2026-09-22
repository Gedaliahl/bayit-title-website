/**
 * What the library index says about the pages, held against the pages.
 *
 * The index tells a reader every page is "re-reviewed every 12 months". That
 * is a statement about the files in content/, and it was once wrong — the
 * index said six months while every page was scheduled for twelve. This reads
 * the real front-matter rather than a fixture, so the sentence and the
 * schedule cannot drift apart again without a failing test.
 */
import fs from 'node:fs';
import path from 'node:path';

import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';

const REVIEW_CYCLE_MONTHS = 12;

function reviewedPages() {
  return ['title-problems', 'services'].flatMap((collection) => {
    const dir = path.join(process.cwd(), 'content', collection);
    return fs
      .readdirSync(dir)
      .filter((file) => file.endsWith('.md'))
      .map((file) => ({
        file: `${collection}/${file}`,
        data: matter(fs.readFileSync(path.join(dir, file), 'utf8')).data,
      }))
      .filter(({ data }) => data.status === 'reviewed');
  });
}

describe('the review cycle the index states', () => {
  it('matches every reviewed page’s scheduled next review', () => {
    const off = reviewedPages().filter(({ data }) => {
      const due = new Date(`${data.reviewed_on}T00:00:00Z`);
      due.setUTCMonth(due.getUTCMonth() + REVIEW_CYCLE_MONTHS);
      return due.toISOString().slice(0, 10) !== String(data.next_review);
    });

    expect(off.map(({ file }) => file)).toEqual([]);
  });
});
