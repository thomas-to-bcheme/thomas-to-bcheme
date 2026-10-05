'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils';
import { cosine, euclidean, meanCentre, pearson } from '@/lib/similarity';

/** Illustrative items and ratings: a generous and a harsh rater who agree on the ranking. */
const ITEMS = ['Film 1', 'Film 2', 'Film 3', 'Film 4', 'Film 5'] as const;
const DEFAULT_RATINGS: Record<RaterId, number[]> = {
  a: [5, 4, 5, 3, 4],
  b: [3, 2, 3, 1, 2],
};
const MIN_RATING = 1;
const MAX_RATING = 5;
const DECIMALS = 3;

type RaterId = 'a' | 'b';

const RATER_STYLES: Record<RaterId, { bar: string; text: string; label: string }> = {
  a: { bar: 'fill-blue-500 dark:fill-blue-400', text: 'text-blue-700 dark:text-blue-400', label: 'Rater a (generous)' },
  b: { bar: 'fill-rose-500 dark:fill-rose-400', text: 'text-rose-700 dark:text-rose-400', label: 'Rater b (harsh)' },
};

const CHART_WIDTH = 300;
const CHART_HEIGHT = 150;
const BAR_WIDTH = 16;

function format(value: number | null): string {
  return value === null ? 'undefined' : value.toFixed(DECIMALS);
}

interface BarChartProps {
  title: string;
  series: Record<RaterId, number[]>;
  /** Value range the chart's vertical axis spans. */
  domain: [number, number];
}

function BarChart({ title, series, domain }: BarChartProps) {
  const [low, high] = domain;
  const toY = (value: number) => CHART_HEIGHT - ((value - low) / (high - low)) * CHART_HEIGHT;
  const baseline = toY(Math.max(low, Math.min(0, high)));
  const slotWidth = CHART_WIDTH / ITEMS.length;
  const means = {
    a: series.a.reduce((sum, value) => sum + value, 0) / series.a.length,
    b: series.b.reduce((sum, value) => sum + value, 0) / series.b.length,
  };

  return (
    <figure>
      <figcaption className="text-micro text-zinc-400 mb-2">{title}</figcaption>
      <svg viewBox={`0 -6 ${CHART_WIDTH} ${CHART_HEIGHT + 24}`} role="img" aria-label={title} className="w-full max-w-md h-auto">
        <line x1={0} y1={baseline} x2={CHART_WIDTH} y2={baseline} className="stroke-zinc-300 dark:stroke-zinc-700" />
        {ITEMS.map((item, itemIndex) => {
          const slotX = itemIndex * slotWidth + slotWidth / 2;
          return (
            <g key={item}>
              {(['a', 'b'] as const).map((rater, raterIndex) => {
                const value = series[rater][itemIndex];
                const y = toY(value);
                return (
                  <rect
                    key={rater}
                    x={slotX - BAR_WIDTH + raterIndex * BAR_WIDTH}
                    y={Math.min(y, baseline)}
                    width={BAR_WIDTH - 2}
                    height={Math.max(Math.abs(baseline - y), 1)}
                    rx={2}
                    className={RATER_STYLES[rater].bar}
                  />
                );
              })}
              <text x={slotX} y={CHART_HEIGHT + 15} textAnchor="middle" className="fill-zinc-500 dark:fill-zinc-400" style={{ fontSize: 11 }}>
                {item}
              </text>
            </g>
          );
        })}
        {(['a', 'b'] as const).map((rater) => (
          <line
            key={rater}
            x1={0}
            x2={CHART_WIDTH}
            y1={toY(means[rater])}
            y2={toY(means[rater])}
            strokeDasharray="5 4"
            className={rater === 'a' ? 'stroke-blue-500/70' : 'stroke-rose-500/70'}
          />
        ))}
      </svg>
    </figure>
  );
}

/**
 * Why Pearson is cosine after mean-centring. In two dimensions Pearson can only
 * be ±1, so this view uses five items instead of the vector plane. The default
 * raters agree perfectly on the ranking but sit two stars apart, which cosine
 * and Euclidean mistake for disagreement and Pearson does not.
 */
export default function RatingsCentringView() {
  const [ratings, setRatings] = useState(DEFAULT_RATINGS);

  const centred = { a: meanCentre(ratings.a), b: meanCentre(ratings.b) };
  const centredLimit = Math.max(1, ...centred.a.map(Math.abs), ...centred.b.map(Math.abs));

  const setRating = (rater: RaterId, itemIndex: number, value: number) =>
    setRatings((current) => ({
      ...current,
      [rater]: current[rater].map((existing, index) => (index === itemIndex ? value : existing)),
    }));

  const readouts = [
    { label: 'Euclidean on raw ratings', value: euclidean(ratings.a, ratings.b), note: 'penalises the offset' },
    { label: 'Cosine on raw ratings', value: cosine(ratings.a, ratings.b), note: 'high, but only because all ratings are positive' },
    { label: 'Pearson (cosine after centring)', value: pearson(ratings.a, ratings.b), note: 'compares the pattern only', isFocus: true },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-5">
        <BarChart title="Raw ratings (dashed = each rater’s mean)" series={ratings} domain={[0, MAX_RATING]} />
        <BarChart title="After subtracting each rater’s mean" series={centred} domain={[-centredLimit, centredLimit]} />
      </div>

      <div className="space-y-5">
        <fieldset>
          <legend className="text-micro text-zinc-400 mb-2">Adjust the ratings</legend>
          <div className="space-y-2">
            {ITEMS.map((item, itemIndex) => (
              <div key={item} className="grid grid-cols-[4.5rem_1fr_1fr] items-center gap-3">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{item}</span>
                {(['a', 'b'] as const).map((rater) => (
                  <label key={rater} className="flex items-center gap-2">
                    <span className={cn('text-xs font-bold w-3', RATER_STYLES[rater].text)}>{rater}</span>
                    <input
                      type="range"
                      min={MIN_RATING}
                      max={MAX_RATING}
                      step={1}
                      value={ratings[rater][itemIndex]}
                      onChange={(event) => setRating(rater, itemIndex, Number(event.target.value))}
                      aria-label={`${RATER_STYLES[rater].label} rating for ${item}`}
                      className="slider-input"
                    />
                    <span className="font-mono text-xs w-3 text-zinc-700 dark:text-zinc-300">{ratings[rater][itemIndex]}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </fieldset>

        <ul className="divide-y divide-zinc-100 dark:divide-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          {readouts.map((readout) => (
            <li key={readout.label} className={cn('px-3 py-2', readout.isFocus && 'bg-blue-50 dark:bg-blue-900/20')}>
              <div className="flex items-baseline justify-between text-sm">
                <span className={readout.isFocus ? 'font-semibold text-blue-800 dark:text-blue-300' : 'text-zinc-600 dark:text-zinc-400'}>
                  {readout.label}
                </span>
                <span className="font-mono text-zinc-900 dark:text-white">{format(readout.value)}</span>
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{readout.note}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
