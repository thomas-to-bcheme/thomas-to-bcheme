'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils';
import { MAX_EDIT_STRING_LENGTH, editDistance, type EditOperation } from '@/lib/similarity';

const DEFAULT_SOURCE = 'kitten';
const DEFAULT_TARGET = 'sitting';
const CELL_SIZE = 28;
const HEADER_SIZE = 28;

const OPERATION_STYLES: Record<EditOperation, { label: string; className: string }> = {
  match: { label: 'match', className: 'text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800' },
  substitute: {
    label: 'substitute',
    className: 'text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20',
  },
  insert: {
    label: 'insert',
    className: 'text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20',
  },
  delete: {
    label: 'delete',
    className: 'text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/20',
  },
};

/**
 * Levenshtein distance as the dynamic-programming table it really is. Each
 * cell is the cheapest way to turn one prefix into the other, shaded by cost,
 * with the backtracked optimal alignment outlined. The answer is the
 * bottom-right cell, and the path explains how it was reached.
 */
export default function EditDistanceView() {
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [target, setTarget] = useState(DEFAULT_TARGET);

  const result = editDistance(source, target);
  const sourceChars = [...source];
  const targetChars = [...target];
  const maxCost = Math.max(1, ...result.matrix.flat());
  const pathCells = new Set(['0,0', ...result.path.map((step) => `${step.row},${step.col}`)]);

  const width = HEADER_SIZE + (targetChars.length + 1) * CELL_SIZE;
  const height = HEADER_SIZE + (sourceChars.length + 1) * CELL_SIZE;

  const describe = (row: number, col: number, operation: EditOperation): string => {
    const from = sourceChars[row - 1];
    const to = targetChars[col - 1];
    if (operation === 'match') return `keep “${from}”`;
    if (operation === 'substitute') return `“${from}” → “${to}”`;
    if (operation === 'insert') return `insert “${to}”`;
    return `delete “${from}”`;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        {[
          { label: 'Source string s', value: source, onChange: setSource },
          { label: 'Target string t', value: target, onChange: setTarget },
        ].map((field) => (
          <label key={field.label} className="block">
            <span className="text-micro text-zinc-400 block mb-1.5">
              {field.label} (max {MAX_EDIT_STRING_LENGTH})
            </span>
            <input
              type="text"
              value={field.value}
              maxLength={MAX_EDIT_STRING_LENGTH}
              onChange={(event) => field.onChange(event.target.value.slice(0, MAX_EDIT_STRING_LENGTH))}
              spellCheck={false}
              autoComplete="off"
              className="input-base w-full font-mono"
            />
          </label>
        ))}

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 flex items-baseline justify-between bg-blue-50 dark:bg-blue-900/20">
          <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">Edit distance</span>
          <span className="font-mono text-lg font-bold text-zinc-900 dark:text-white">{result.distance}</span>
        </div>

        <div>
          <span className="text-micro text-zinc-400 block mb-2">Optimal alignment</span>
          {result.path.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Both strings are empty.</p>
          ) : (
            <ol className="flex flex-wrap gap-1.5">
              {result.path.map((step) => (
                <li
                  key={`${step.row}-${step.col}`}
                  className={cn('px-2 py-1 rounded border text-xs font-mono', OPERATION_STYLES[step.operation].className)}
                >
                  {describe(step.row, step.col, step.operation)}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <figure>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-[460px] mx-auto h-auto"
          role="img"
          aria-label={`Dynamic-programming table for the edit distance between "${source}" and "${target}". The bottom-right cell holds the distance, ${result.distance}.`}
        >
          {targetChars.map((char, col) => (
            <text
              key={`t-${col}`}
              x={HEADER_SIZE + (col + 1.5) * CELL_SIZE}
              y={HEADER_SIZE * 0.65}
              textAnchor="middle"
              className="fill-zinc-700 dark:fill-zinc-300 font-mono font-bold"
              style={{ fontSize: 13 }}
            >
              {char}
            </text>
          ))}
          {sourceChars.map((char, row) => (
            <text
              key={`s-${row}`}
              x={HEADER_SIZE * 0.5}
              y={HEADER_SIZE + (row + 1.5) * CELL_SIZE + 4}
              textAnchor="middle"
              className="fill-zinc-700 dark:fill-zinc-300 font-mono font-bold"
              style={{ fontSize: 13 }}
            >
              {char}
            </text>
          ))}
          {result.matrix.map((cells, row) =>
            cells.map((cost, col) => {
              const x = HEADER_SIZE + col * CELL_SIZE;
              const y = HEADER_SIZE + row * CELL_SIZE;
              const isOnPath = pathCells.has(`${row},${col}`);
              return (
                <g key={`${row}-${col}`}>
                  <rect
                    x={x + 1}
                    y={y + 1}
                    width={CELL_SIZE - 2}
                    height={CELL_SIZE - 2}
                    rx={4}
                    className="fill-blue-500"
                    fillOpacity={0.08 + 0.55 * (cost / maxCost)}
                  />
                  {isOnPath && (
                    <rect
                      x={x + 1.5}
                      y={y + 1.5}
                      width={CELL_SIZE - 3}
                      height={CELL_SIZE - 3}
                      rx={4}
                      fill="none"
                      strokeWidth={2.5}
                      className="stroke-amber-500 dark:stroke-amber-400"
                    />
                  )}
                  <text
                    x={x + CELL_SIZE / 2}
                    y={y + CELL_SIZE / 2 + 4}
                    textAnchor="middle"
                    className={cn('font-mono', isOnPath ? 'fill-zinc-900 dark:fill-white font-bold' : 'fill-zinc-600 dark:fill-zinc-300')}
                    style={{ fontSize: 12 }}
                  >
                    {cost}
                  </text>
                </g>
              );
            }),
          )}
        </svg>
        <figcaption className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 text-center">
          Rows follow s and columns follow t. Each cell is the cheapest of: above + 1 (delete), left + 1 (insert), or diagonal + 0 on a
          match, + 1 on a substitution.
        </figcaption>
      </figure>
    </div>
  );
}
