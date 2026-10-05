'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils';
import { setOverlap, vennCentreDistance } from '@/lib/similarity';

/** Illustrative catalogue: two viewers' watched-genre sets. */
const UNIVERSE = [
  'sci-fi',
  'drama',
  'thriller',
  'comedy',
  'horror',
  'romance',
  'documentary',
  'animation',
  'crime',
  'fantasy',
] as const;
type Item = (typeof UNIVERSE)[number];

const DEFAULT_SETS: Record<SetId, Item[]> = {
  a: ['sci-fi', 'thriller', 'fantasy'],
  b: ['sci-fi', 'thriller', 'drama', 'crime', 'documentary', 'comedy', 'romance'],
};

type SetId = 'a' | 'b';

const SET_STYLES: Record<SetId, { chipOn: string; circle: string; text: string; label: string }> = {
  a: {
    chipOn: 'bg-blue-600 border-blue-600 text-white dark:bg-blue-500 dark:border-blue-500',
    circle: 'fill-blue-500/25 stroke-blue-600 dark:stroke-blue-400',
    text: 'text-blue-700 dark:text-blue-400',
    label: 'Set A',
  },
  b: {
    chipOn: 'bg-rose-600 border-rose-600 text-white dark:bg-rose-500 dark:border-rose-500',
    circle: 'fill-rose-500/25 stroke-rose-600 dark:stroke-rose-400',
    text: 'text-rose-700 dark:text-rose-400',
    label: 'Set B',
  },
};

const VIEW_WIDTH = 340;
const VIEW_HEIGHT = 200;
/** Circle area per item, in square view units. */
const AREA_PER_ITEM = 900;
const DECIMALS = 3;

function format(value: number | null): string {
  return value === null ? 'undefined' : value.toFixed(DECIMALS);
}

/**
 * Jaccard on sets, drawn as an area-proportional Venn diagram: circle areas
 * scale with |A| and |B|, and the overlap area with |A ∩ B| (centre spacing is
 * solved by bisection in src/lib/similarity.ts). Next to it, cosine on the
 * same sets read as binary vectors, so the reader sees the one difference
 * that matters: Jaccard divides by the union and penalises a size mismatch.
 */
export default function SetOverlapView() {
  const [sets, setSets] = useState<Record<SetId, Set<Item>>>({
    a: new Set(DEFAULT_SETS.a),
    b: new Set(DEFAULT_SETS.b),
  });

  const overlap = setOverlap(sets.a, sets.b);
  const radiusA = Math.sqrt((overlap.sizeA * AREA_PER_ITEM) / Math.PI);
  const radiusB = Math.sqrt((overlap.sizeB * AREA_PER_ITEM) / Math.PI);
  const distance =
    overlap.sizeA === 0 || overlap.sizeB === 0
      ? radiusA + radiusB + 10
      : vennCentreDistance(radiusA, radiusB, overlap.intersection * AREA_PER_ITEM);
  const span = radiusA + distance + radiusB;
  const centreAX = VIEW_WIDTH / 2 - span / 2 + radiusA;
  const centreBX = centreAX + distance;
  const centreY = VIEW_HEIGHT / 2;

  const toggle = (setId: SetId, item: Item) =>
    setSets((current) => {
      const next = new Set(current[setId]);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return { ...current, [setId]: next };
    });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        {(['a', 'b'] as const).map((setId) => (
          <fieldset key={setId}>
            <legend className={cn('text-micro mb-2', SET_STYLES[setId].text)}>
              {SET_STYLES[setId].label} · {sets[setId].size} items
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {UNIVERSE.map((item) => {
                const isOn = sets[setId].has(item);
                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={isOn}
                    onClick={() => toggle(setId, item)}
                    className={cn(
                      'px-2 py-1 rounded border text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                      isOn
                        ? SET_STYLES[setId].chipOn
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-400',
                    )}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        <ul className="divide-y divide-zinc-100 dark:divide-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm">
          <li className="flex justify-between px-3 py-1.5">
            <span className="text-zinc-600 dark:text-zinc-400">|A ∩ B| / |A ∪ B|</span>
            <span className="font-mono text-zinc-900 dark:text-white">
              {overlap.intersection} / {overlap.union}
            </span>
          </li>
          <li className="flex justify-between px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 font-semibold">
            <span className="text-blue-800 dark:text-blue-300">Jaccard</span>
            <span className="font-mono text-zinc-900 dark:text-white">{format(overlap.jaccard)}</span>
          </li>
          <li className="flex justify-between px-3 py-1.5">
            <span className="text-zinc-600 dark:text-zinc-400">Cosine on binary vectors, |A ∩ B| / √(|A||B|)</span>
            <span className="font-mono text-zinc-900 dark:text-white">{format(overlap.binaryCosine)}</span>
          </li>
        </ul>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Try making A a small subset of B: cosine stays fairly high because it divides by the geometric mean of the sizes, while Jaccard
          drops because every item only B has still counts in the union.
        </p>
      </div>

      <figure>
        <svg
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          className="w-full h-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
          role="img"
          aria-label={`Venn diagram: A has ${overlap.sizeA} items, B has ${overlap.sizeB}, and they share ${overlap.intersection}.`}
        >
          {overlap.sizeA > 0 && <circle cx={centreAX} cy={centreY} r={radiusA} className={SET_STYLES.a.circle} strokeWidth={2} />}
          {overlap.sizeB > 0 && <circle cx={centreBX} cy={centreY} r={radiusB} className={SET_STYLES.b.circle} strokeWidth={2} />}
          {overlap.sizeA > 0 && (
            <text x={centreAX - radiusA * 0.45} y={centreY + 5} textAnchor="middle" className="fill-blue-800 dark:fill-blue-300 font-bold" style={{ fontSize: 14 }}>
              {overlap.sizeA - overlap.intersection}
            </text>
          )}
          {overlap.sizeB > 0 && (
            <text x={centreBX + radiusB * 0.45} y={centreY + 5} textAnchor="middle" className="fill-rose-800 dark:fill-rose-300 font-bold" style={{ fontSize: 14 }}>
              {overlap.sizeB - overlap.intersection}
            </text>
          )}
          {overlap.intersection > 0 && (
            <text x={(centreAX + radiusA + centreBX - radiusB) / 2} y={centreY + 5} textAnchor="middle" className="fill-zinc-900 dark:fill-white font-bold" style={{ fontSize: 14 }}>
              {overlap.intersection}
            </text>
          )}
        </svg>
        <figcaption className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 text-center">
          Areas are proportional to set sizes. The numbers count the items in each region.
        </figcaption>
      </figure>
    </div>
  );
}
