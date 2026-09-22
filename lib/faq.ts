// Extracts the FAQ section from a page body so it can be emitted as FAQPage
// JSON-LD. Parsed from the Markdown rather than duplicated in front-matter,
// so the rendered page and the structured data can never drift apart.

export interface FaqItem {
  question: string;
  /** Plain text. What the JSON-LD carries, where markup has no meaning. */
  answer: string;
  /**
   * The answer as the page shows it, rendered from its Markdown. An answer can
   * be a list, several paragraphs, or a statute citation whose link is the
   * point of it, and none of that survives being flattened to `answer`. Absent
   * on a question written directly in a page rather than read off a file.
   */
  html?: string;
}

/** A question and its answer's Markdown, before either is rendered or flattened. */
export interface FaqEntry {
  question: string;
  markdown: string;
}

const FAQ_HEADING = /^##\s+(faq|common questions|questions we get|frequently asked)/i;

/**
 * Whether a `## ` heading opens the FAQ. Exported so the page template and the
 * JSON-LD agree on which section that is: the template renders it as a
 * disclosure list from `faqEntries` rather than as prose, and a section counted
 * as an FAQ here but not there would be rendered twice.
 */
export function isFaqHeading(heading: string): boolean {
  return FAQ_HEADING.test(`## ${heading.trim()}`);
}

/** Strips Markdown emphasis, links, list markers and inline code down to plain text for JSON-LD. */
export function toPlainText(markdown: string): string {
  return markdown
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Every question under the FAQ heading, with its answer's Markdown intact —
 * line breaks included, so the lists and paragraphs in it still parse. The
 * page renders these; `extractFaq` flattens them for the structured data.
 */
export function faqEntries(markdown: string): FaqEntry[] {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => FAQ_HEADING.test(line.trim()));
  if (start === -1) return [];

  const entries: FaqEntry[] = [];
  let question: string | null = null;
  let answer: string[] = [];

  const flush = () => {
    const body = answer.join('\n').trim();
    if (question && body) entries.push({ question, markdown: body });
    question = null;
    answer = [];
  };

  for (const line of lines.slice(start + 1)) {
    const trimmed = line.trim();

    // A new H2 ends the FAQ section.
    if (/^##\s+/.test(trimmed) && !/^###/.test(trimmed)) break;

    const heading = trimmed.match(/^###\s+(.*)$/);
    if (heading) {
      flush();
      question = toPlainText(heading[1]);
      continue;
    }

    if (question) answer.push(line);
  }
  flush();

  return entries;
}

export function extractFaq(markdown: string): FaqItem[] {
  // An unresolved [VERIFY] flag must never reach structured data, where a
  // search engine or assistant would quote it as a settled answer.
  return faqEntries(markdown)
    .map((entry) => ({ question: entry.question, answer: toPlainText(entry.markdown) }))
    .filter((item) => !/\[VERIFY/i.test(item.answer) && !/\[VERIFY/i.test(item.question));
}
