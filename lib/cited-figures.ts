/**
 * A figure and the authority that sets it, kept together. Every number this
 * site publishes about what a closing costs is one of these: nothing is stated
 * without the section, rule or schedule a reader can open and check.
 */
export interface CitedFigure {
  /** What is being charged, in the reader's terms. */
  label: string;
  /** The figure, written the way the authority writes it. */
  amount: string;
  /** Cited so a reader can look it up. */
  cite: string;
  sourceUrl: string;
  /** Anything a reader would get wrong from the amount alone. */
  note?: string;
}
