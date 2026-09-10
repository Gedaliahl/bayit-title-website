// Extracts the FAQ section from a page body so it can be emitted as FAQPage
// JSON-LD. Parsed from the Markdown rather than duplicated in front-matter,
// so the rendered page and the structured data can never drift apart.

export interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_HEADING = /^##\s+(faq|common questions|questions we get|frequently asked)/i;

/** Strips Markdown emphasis, links and inline code down to plain text for JSON-LD. */
function toPlainText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractFaq(markdown: string): FaqItem[] {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => FAQ_HEADING.test(line.trim()));
  if (start === -1) return [];

  const items: FaqItem[] = [];
  let question: string | null = null;
  let answer: string[] = [];

  const flush = () => {
    if (question && answer.length > 0) {
      items.push({ question, answer: toPlainText(answer.join(' ')) });
    }
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

    if (question && trimmed) answer.push(trimmed);
  }
  flush();

  // An unresolved [VERIFY] flag must never reach structured data, where a
  // search engine or assistant would quote it as a settled answer.
  return items.filter((item) => !/\[VERIFY/i.test(item.answer) && !/\[VERIFY/i.test(item.question));
}
