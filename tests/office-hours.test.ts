/**
 * The office hours, said once.
 *
 * `site.hours` is a list whose length changes when the firm's hours do. A page
 * that reached for `site.hours[0]` and `site.hours[1]` printed "and Saturday –
 * Sunday  to ;" on the order page the day the two weekday rows became one, and
 * nothing failed. Every page reads `officeHoursLine` instead, and this is the
 * check that keeps it that way.
 */
import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { officeHoursLine } from '@/lib/site';

const ROOTS = ['app', 'components', 'lib', 'content'];

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(tsx?|md)$/.test(entry.name) ? [full] : [];
  });
}

describe('office hours', () => {
  it('are never read out of site.hours by position', () => {
    const offenders = ROOTS.flatMap(sourceFiles).filter((file) =>
      // Code only: lib/site.ts explains the rule in a comment that names the
      // pattern it forbids.
      fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .some((line) => /hours\[\d+\]/.test(line) && !/^\s*(\*|\/\/)/.test(line)),
    );

    expect(offenders).toEqual([]);
  });

  it('read as a sentence with no empty slots', () => {
    expect(officeHoursLine).not.toMatch(/null|undefined|\s{2}|to ;|;\s*$/);
    expect(officeHoursLine.length).toBeGreaterThan(0);
  });
});
