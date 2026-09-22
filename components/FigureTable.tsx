/**
 * A table of worked figures: a premium at common prices, the stamps on common
 * loans. Every cell is computed by the caller from the rule or statute it
 * cites, never typed in, so a table cannot disagree with the calculator above
 * it.
 *
 * Wrapped the way the Markdown tables are (lib/content.ts): the table keeps
 * display: table, which is what a screen reader needs to read it as one, and a
 * focusable region scrolls it at 280px rather than letting it widen the page.
 */
export function FigureTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  /** The first cell of each row is its label; the rest are figures. */
  rows: string[][];
}) {
  return (
    <div className="table-scroll" role="region" tabIndex={0} aria-label={caption}>
      <table className="figure-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={column} scope="col" className={index > 0 ? 'num' : undefined}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]}>
              <th scope="row">{row[0]}</th>
              {row.slice(1).map((cell, index) => (
                <td key={`${row[0]}-${columns[index + 1]}`} className="num">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
