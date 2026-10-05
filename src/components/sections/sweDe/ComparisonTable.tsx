import type { ComparisonTable as ComparisonTableData } from '@/constants/sweDe';

const CELL = 'align-top p-3 border-t border-zinc-100 dark:border-zinc-900 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed';
const HEADER_CELL = 'text-left p-3 text-micro text-zinc-400 font-bold uppercase tracking-wider whitespace-nowrap';

/** Column-count-based min width keeps cells legible; the wrapper scrolls, never the page. */
const MIN_WIDTH_BY_COLUMN_COUNT: Record<number, string> = {
  3: 'min-w-[44rem]',
  4: 'min-w-[56rem]',
  5: 'min-w-[68rem]',
};
const DEFAULT_MIN_WIDTH = 'min-w-[44rem]';

interface ComparisonTableProps {
  table: ComparisonTableData;
}

/**
 * Prop-driven comparison table — the OperationalGoalTaxonomy table styling,
 * generalized: a real <table> because reading down a column across rows is
 * the point, inside its own overflow-x-auto container.
 */
const ComparisonTable = ({ table }: ComparisonTableProps) => {
  const columnCount = table.columns.length + 1;
  const minWidth = MIN_WIDTH_BY_COLUMN_COUNT[columnCount] ?? DEFAULT_MIN_WIDTH;

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className={`w-full ${minWidth} border-collapse text-left`}>
        <caption className="sr-only">{table.caption}</caption>
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th scope="col" className={HEADER_CELL}>
              {table.rowHeader}
            </th>
            {table.columns.map((column) => (
              <th key={column} scope="col" className={HEADER_CELL}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.id}>
              <th scope="row" className={`${CELL} font-bold text-zinc-900 dark:text-white whitespace-nowrap`}>
                {row.label}
              </th>
              {row.cells.map((cell, columnPosition) => (
                <td key={table.columns[columnPosition]} className={CELL}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ComparisonTable;
