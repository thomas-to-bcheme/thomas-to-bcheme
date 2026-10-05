'use client';

import { useMemo, useRef } from 'react';
import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
import { Check, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { scrollToAnchor } from '@/lib/scrollToAnchor';
import {
  VECTORIZATION_LEVELS,
  type ProblemGenreId,
  type SimilarityMetric,
  type SimilarityMetricId,
} from '@/constants/aiMl/types';

import { selectViaHash, useHashSelection } from './hashSelection';
import { GENRE_COLORS } from './ProblemGenreMap';
import VectorPlaneView, { type PlaneMetricId } from './similarity/VectorPlaneView';
import RatingsCentringView from './similarity/RatingsCentringView';
import SetOverlapView from './similarity/SetOverlapView';
import EditDistanceView from './similarity/EditDistanceView';

export interface SimilarityMetricView extends Omit<SimilarityMetric, 'expression' | 'relatedSlugs'> {
  relatedModels: { slug: string; name: string; href: string }[];
  genres: { id: ProblemGenreId; label: string }[];
}

interface SimilarityExplorerProps {
  metrics: SimilarityMetricView[];
  /** Server-rendered KaTeX per metric (formula plus symbol legend). */
  math: Partial<Record<SimilarityMetricId, React.ReactNode>>;
  /** id of the genre map section, scrolled to from genre chips. */
  genreAnchorId: string;
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black';

const PROPERTY_LABELS: { key: 'isTrueMetric' | 'isBounded' | 'isScaleInvariant' | 'isTranslationInvariant'; label: string }[] = [
  { key: 'isTrueMetric', label: 'True metric' },
  { key: 'isBounded', label: 'Bounded' },
  { key: 'isScaleInvariant', label: 'Scale-invariant' },
  { key: 'isTranslationInvariant', label: 'Shift-invariant' },
];

/**
 * One metric at a time, shown three ways:
 *  - where it sits on the vectorization ladder (what the data must become first);
 *  - a live view that computes it on inputs the reader controls;
 *  - the mathematics it is built on, with when to reach for it and when not.
 *
 * The selected metric lives in the URL hash, so the genre map's metric chips
 * can select one here and any metric is deep-linkable.
 */
export default function SimilarityExplorer({ metrics, math, genreAnchorId }: SimilarityExplorerProps) {
  const prefersReducedMotion = useReducedMotion();
  const metricIds = useMemo(() => metrics.map((metric) => metric.id), [metrics]);
  const [selectedId, select] = useHashSelection<SimilarityMetricId>('metric', metricIds, metricIds[0]);
  const tabRefs = useRef<Partial<Record<SimilarityMetricId, HTMLButtonElement | null>>>({});

  const selected = metrics.find((metric) => metric.id === selectedId) ?? metrics[0];
  const planeLabels = Object.fromEntries(metrics.map((metric) => [metric.id, metric.label])) as Record<PlaneMetricId, string>;

  // Arrow-key roving focus, per the ARIA tabs pattern.
  const handleKeyDown = (event: React.KeyboardEvent) => {
    const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (offset === 0) return;
    event.preventDefault();
    const index = metricIds.indexOf(selected.id);
    const next = metricIds[(index + offset + metricIds.length) % metricIds.length];
    select(next);
    tabRefs.current[next]?.focus();
  };

  const handleGenreClick = (genreId: ProblemGenreId) => (event: React.MouseEvent) => {
    event.preventDefault();
    selectViaHash('genre', genreId);
    scrollToAnchor(genreAnchorId, { prefersReducedMotion: prefersReducedMotion ?? false });
  };

  return (
    <div className="card-base p-4 sm:p-6">
      {/* The ladder: least structure on the left, most on the right. */}
      <div>
        <span className="text-micro text-zinc-400 block mb-2">How much structure does the metric need?</span>
        <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {VECTORIZATION_LEVELS.map((level, levelIndex) => {
            const isCurrent = level.id === selected.representation;
            const levelMetrics = metrics.filter((metric) => metric.representation === level.id);
            return (
              <li
                key={level.id}
                className={cn(
                  'rounded-lg border px-2.5 py-2 transition-colors',
                  isCurrent
                    ? 'border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-zinc-200 dark:border-zinc-800',
                )}
              >
                <span className="flex items-baseline gap-1.5">
                  <span className="font-mono text-xs text-zinc-400">{levelIndex + 1}</span>
                  <span className={cn('text-sm font-bold', isCurrent ? 'text-blue-800 dark:text-blue-300' : 'text-zinc-800 dark:text-zinc-200')}>
                    {level.label}
                  </span>
                </span>
                <span className="mt-1 flex flex-wrap gap-1">
                  {levelMetrics.map((metric) => (
                    <button
                      key={metric.id}
                      type="button"
                      tabIndex={-1}
                      onClick={() => select(metric.id)}
                      className={cn(
                        'text-xs rounded px-1.5 py-0.5',
                        metric.id === selected.id
                          ? 'bg-blue-600 text-white dark:bg-blue-500'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white',
                      )}
                    >
                      {metric.label}
                    </button>
                  ))}
                </span>
              </li>
            );
          })}
        </ol>
        {VECTORIZATION_LEVELS.filter((level) => level.id === selected.representation).map((level) => (
          <p key={level.id} className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            <span className="font-semibold text-zinc-900 dark:text-white">{level.label}: </span>
            {level.representation} <span className="text-zinc-500">Preprocessing: {level.preprocessing}</span>
          </p>
        ))}
      </div>

      <div
        role="tablist"
        aria-label="Similarity and distance metrics"
        onKeyDown={handleKeyDown}
        className="mt-6 flex flex-wrap items-center gap-2"
      >
        {metrics.map((metric) => {
          const isActive = metric.id === selected.id;
          return (
            <button
              key={metric.id}
              ref={(node) => {
                tabRefs.current[metric.id] = node;
              }}
              type="button"
              role="tab"
              id={`metric-tab-${metric.id}`}
              aria-selected={isActive}
              aria-controls="metric-panel"
              tabIndex={isActive ? 0 : -1}
              onClick={() => select(metric.id)}
              className={cn(
                'inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors',
                FOCUS_RING,
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                  : 'bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700',
              )}
            >
              {metric.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id="metric-panel" aria-labelledby={`metric-tab-${selected.id}`} className="mt-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{selected.label}</h3>
          <span className="text-micro text-zinc-400">{selected.kind}</span>
        </div>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{selected.coordinateSystem}</p>

        <div className="mt-5">
          {selected.view === 'vector-plane' && (
            <VectorPlaneView metricId={selected.id as PlaneMetricId} metricLabels={planeLabels} />
          )}
          {selected.view === 'ratings' && <RatingsCentringView />}
          {selected.view === 'set' && <SetOverlapView />}
          {selected.view === 'sequence' && <EditDistanceView />}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2 border-t border-zinc-200 dark:border-zinc-800 pt-5">
          <div className="space-y-4 min-w-0">
            <div className="overflow-x-auto">{math[selected.id]}</div>
            <div>
              <span className="text-micro text-zinc-400 block mb-2">Properties</span>
              <ul className="flex flex-wrap gap-1.5">
                {PROPERTY_LABELS.map(({ key, label }) => {
                  const holds = selected.properties[key];
                  return (
                    <li
                      key={key}
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-semibold',
                        holds
                          ? 'border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400',
                      )}
                    >
                      {holds ? <Check size={12} aria-hidden="true" /> : <X size={12} aria-hidden="true" />}
                      <span>
                        <span className="sr-only">{holds ? 'Is' : 'Is not'} </span>
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{selected.properties.complexity}</p>
            </div>
            <div>
              <span className="text-micro text-zinc-400 block mb-1.5">The mathematics underneath</span>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{selected.foundation}</p>
            </div>
          </div>

          <dl className="space-y-4">
            <div>
              <dt className="text-micro text-emerald-600 dark:text-emerald-400 mb-1">Reach for it when</dt>
              <dd className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{selected.whenToUse}</dd>
            </div>
            <div>
              <dt className="text-micro text-blue-600 dark:text-blue-400 mb-1">Why not the alternatives</dt>
              <dd className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{selected.whyNotAlternatives}</dd>
            </div>
            <div>
              <dt className="text-micro text-rose-600 dark:text-rose-400 mb-1">Where it breaks</dt>
              <dd className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{selected.failureMode}</dd>
            </div>
            {selected.genres.length > 0 && (
              <div>
                <dt className="text-micro text-zinc-400 mb-1.5">Problem genres that lean on it</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {selected.genres.map((genre) => (
                    <a
                      key={genre.id}
                      href={`#genre-${genre.id}`}
                      onClick={handleGenreClick(genre.id)}
                      className={cn('px-2 py-1 rounded border text-xs font-semibold', GENRE_COLORS[genre.id].chip, FOCUS_RING)}
                    >
                      {genre.label}
                    </a>
                  ))}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-micro text-zinc-400 mb-1.5">Models built on it</dt>
              <dd className="flex flex-wrap gap-1.5">
                {selected.relatedModels.map((model) => (
                  <Link key={model.slug} href={model.href} className={cn('tag-blue hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors', FOCUS_RING)}>
                    {model.name}
                  </Link>
                ))}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
