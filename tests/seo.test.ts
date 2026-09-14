/**
 * Meta descriptions come from the direct answer, which is already written to
 * stand alone. Trimming it must not invent anything or cut mid-thought.
 */
import { describe, expect, it } from 'vitest';

import { metaDescription, formatLongDate, formatReviewDate } from '@/lib/seo';

describe('meta descriptions', () => {
  it('leaves a short answer alone', () => {
    expect(metaDescription('An open permit is a permit the municipality never closed.'))
      .toBe('An open permit is a permit the municipality never closed.');
  });

  it('cuts at the end of a sentence rather than mid-thought', () => {
    const text =
      'A municipal lien search is not a title search, and a Florida closing needs both. ' +
      'It finds unrecorded municipal claims that a title search will not show, and it is ' +
      'ordered separately from the search itself.';

    const trimmed = metaDescription(text);

    expect(text.length).toBeGreaterThan(155);
    expect(trimmed).toBe(
      'A municipal lien search is not a title search, and a Florida closing needs both.',
    );
    expect(trimmed.length).toBeLessThanOrEqual(155);
  });

  it('falls back to a word boundary when no sentence ends in range', () => {
    const trimmed = metaDescription(`${'word '.repeat(60)}end`);

    expect(trimmed.endsWith('…')).toBe(true);
    expect(trimmed).not.toMatch(/\s…$/);
  });

  it('flattens the whitespace a markdown paragraph carries', () => {
    expect(metaDescription('Two lines\n  joined   loosely.')).toBe('Two lines joined loosely.');
  });
});

describe('dates', () => {
  it('renders a front-matter date on the day it says, whatever the build server is set to', () => {
    // Parsed as UTC on purpose: a naive parse shifts this to September 9th
    // west of Greenwich, and the byline date would disagree with the front matter.
    expect(formatLongDate('2026-09-10')).toBe('September 10, 2026');
  });

  it('prints nothing for a review with no trustworthy date', () => {
    expect(formatReviewDate(null)).toBeNull();
  });

  it('gives a review a month and year, never a day', () => {
    expect(formatReviewDate('2026-03-01')).toBe('March 2026');
  });
});
