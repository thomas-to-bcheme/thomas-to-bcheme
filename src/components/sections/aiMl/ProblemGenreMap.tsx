'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { scrollToAnchor } from '@/lib/scrollToAnchor';
import type { ProblemGenreId, SimilarityMetricId } from '@/constants/aiMl/types';

import { selectViaHash, useHashSelection } from './hashSelection';

export interface GenreLeafView {
  slug: string;
  label: string;
  examples: string[];
  href: string;
  modelName: string;
  categoryLabel: string;
}

export interface GenreView {
  id: ProblemGenreId;
  label: string;
  question: string;
  output: string;
  typicalObjective: string;
  metricRationale: string;
  anchorHref: string | null;
  anchorLabel: string;
  leaves: GenreLeafView[];
  metrics: { id: SimilarityMetricId; label: string }[];
}

interface ProblemGenreMapProps {
  genres: GenreView[];
  /** id of the similarity explorer section, scrolled to from metric chips. */
  explorerAnchorId: string;
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black';

// Full literal class strings: Tailwind only compiles class names it can find
// verbatim, so `fill-${hue}-500` would silently produce nothing. Hues follow
// the source mind map (regression red, classification blue, and so on).
const GENRE_COLORS: Record<
  ProblemGenreId,
  { pill: string; spoke: string; leaf: string; chip: string; dot: string }
> = {
  regression: {
    pill: 'fill-rose-500',
    spoke: 'stroke-rose-400 dark:stroke-rose-500',
    leaf: 'fill-rose-700 dark:fill-rose-300',
    chip: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300',
    dot: 'bg-rose-500',
  },
  classification: {
    pill: 'fill-blue-500',
    spoke: 'stroke-blue-400 dark:stroke-blue-500',
    leaf: 'fill-blue-700 dark:fill-blue-300',
    chip: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
    dot: 'bg-blue-500',
  },
  optimization: {
    pill: 'fill-emerald-600',
    spoke: 'stroke-emerald-400 dark:stroke-emerald-500',
    leaf: 'fill-emerald-700 dark:fill-emerald-300',
    chip: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-600',
  },
  'nlp-llm': {
    pill: 'fill-orange-500',
    spoke: 'stroke-orange-400 dark:stroke-orange-500',
    leaf: 'fill-orange-700 dark:fill-orange-300',
    chip: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300',
    dot: 'bg-orange-500',
  },
  forecasting: {
    pill: 'fill-cyan-600',
    spoke: 'stroke-cyan-400 dark:stroke-cyan-500',
    leaf: 'fill-cyan-700 dark:fill-cyan-300',
    chip: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300',
    dot: 'bg-cyan-600',
  },
  'recommender-system': {
    pill: 'fill-violet-600',
    spoke: 'stroke-violet-400 dark:stroke-violet-500',
    leaf: 'fill-violet-700 dark:fill-violet-300',
    chip: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300',
    dot: 'bg-violet-600',
  },
  'computer-vision': {
    pill: 'fill-amber-500',
    spoke: 'stroke-amber-400 dark:stroke-amber-500',
    leaf: 'fill-amber-700 dark:fill-amber-300',
    chip: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  clustering: {
    pill: 'fill-fuchsia-500',
    spoke: 'stroke-fuchsia-400 dark:stroke-fuchsia-500',
    leaf: 'fill-fuchsia-700 dark:fill-fuchsia-300',
    chip: 'bg-fuchsia-50 dark:bg-fuchsia-900/20 border-fuchsia-200 dark:border-fuchsia-800 text-fuchsia-700 dark:text-fuchsia-300',
    dot: 'bg-fuchsia-500',
  },
};

const HUB_GRADIENT = { from: '#3b82f6', to: '#ec4899' };

interface MapGeometry {
  /**
   * 'radial' rings the genres round the hub, like the source mind map. 'grid'
   * hangs them in two columns below the hub, for widths where a ring of
   * readable pills cannot fit without overlapping.
   */
  layout: 'radial' | 'grid';
  width: number;
  height: number;
  /** Radial only: the ellipse the genres sit on. */
  radiusX: number;
  radiusY: number;
  /** Grid only: vertical distance between rows of genres. */
  rowSpacing: number;
  hubWidth: number;
  hubHeight: number;
  pillHeight: number;
  /** Approximate glyph advance for pill widths; SVG has no auto-sizing. */
  charWidth: number;
  fontSize: number;
  showLeaves: boolean;
  leafSpacing: number;
  leafGap: number;
}

/** Full map with leaf columns, for md and up. */
const DESKTOP_GEOMETRY: MapGeometry = {
  layout: 'radial',
  width: 1180,
  height: 860,
  radiusX: 255,
  radiusY: 300,
  rowSpacing: 0,
  hubWidth: 170,
  hubHeight: 74,
  pillHeight: 40,
  charWidth: 9.2,
  fontSize: 16,
  showLeaves: true,
  leafSpacing: 19,
  leafGap: 26,
};

/** Hub and genres only; leaves move into the detail panel on phones. */
const COMPACT_GEOMETRY: MapGeometry = {
  layout: 'grid',
  width: 400,
  height: 0,
  radiusX: 0,
  radiusY: 0,
  rowSpacing: 52,
  hubWidth: 116,
  hubHeight: 52,
  pillHeight: 34,
  charWidth: 8.4,
  fontSize: 14,
  showLeaves: false,
  leafSpacing: 0,
  leafGap: 0,
};

/**
 * Genres sit on an ellipse, offset half a step from vertical so no genre is
 * straight above or below the hub, where a leaf column would collide with
 * the spoke. Index 0 lands top-left and the rest follow clockwise, matching
 * PROBLEM_GENRES' array order.
 */
function genreAngle(index: number, count: number): number {
  const step = (2 * Math.PI) / count;
  return -Math.PI / 2 - step / 2 + index * step;
}

interface PlacedGenre {
  genre: GenreView;
  x: number;
  y: number;
  pillWidth: number;
  isRightSide: boolean;
}

/**
 * Server and browser trig can differ in the last bit, which React reports as a
 * hydration mismatch on every SVG attribute. A hundredth of a view unit is far
 * below a pixel, so rounding costs nothing visible.
 */
function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Where the hub sits: the centre of a ring, or the top of a grid. */
function hubCentre(geometry: MapGeometry): { x: number; y: number } {
  return geometry.layout === 'radial'
    ? { x: geometry.width / 2, y: geometry.height / 2 }
    : { x: geometry.width / 2, y: geometry.hubHeight / 2 };
}

const GRID_COLUMNS = 2;
/** Gap between the hub's bottom edge and the first row of genres in grid layout. */
const GRID_HUB_CLEARANCE = 40;

function placeGenres(genres: GenreView[], geometry: MapGeometry): PlacedGenre[] {
  if (geometry.layout === 'grid') {
    const columnWidth = geometry.width / GRID_COLUMNS;
    const firstRowY = geometry.hubHeight + GRID_HUB_CLEARANCE;
    return genres.map((genre, index) => {
      const column = index % GRID_COLUMNS;
      return {
        genre,
        x: roundCoordinate(columnWidth * (column + 0.5)),
        y: roundCoordinate(firstRowY + Math.floor(index / GRID_COLUMNS) * geometry.rowSpacing),
        pillWidth: genre.label.length * geometry.charWidth + 32,
        isRightSide: column === GRID_COLUMNS - 1,
      };
    });
  }

  const centreX = geometry.width / 2;
  const centreY = geometry.height / 2;
  return genres.map((genre, index) => {
    const angle = genreAngle(index, genres.length);
    return {
      genre,
      x: roundCoordinate(centreX + geometry.radiusX * Math.cos(angle)),
      y: roundCoordinate(centreY + geometry.radiusY * Math.sin(angle)),
      pillWidth: genre.label.length * geometry.charWidth + 32,
      isRightSide: Math.cos(angle) >= 0,
    };
  });
}

/** Vertical breathing room above the topmost and below the lowest element. */
const VIEW_PADDING = 24;

/**
 * Tight vertical bounds of everything drawn: pills, and leaf columns when
 * shown. The viewBox fits the content instead of a fixed height, so adding
 * leaves can never clip and removing them leaves no dead band.
 */
function verticalBounds(placed: PlacedGenre[], geometry: MapGeometry): { top: number; height: number } {
  const extents = placed.flatMap(({ genre, y }) => {
    const pillHalf = geometry.pillHeight / 2;
    const columnHalf = geometry.showLeaves ? ((genre.leaves.length - 1) * geometry.leafSpacing) / 2 + geometry.leafSpacing / 2 : 0;
    const half = Math.max(pillHalf, columnHalf);
    return [y - half, y + half];
  });
  const hub = hubCentre(geometry);
  const top = Math.min(...extents, hub.y - geometry.hubHeight / 2) - VIEW_PADDING;
  const bottom = Math.max(...extents, hub.y + geometry.hubHeight / 2) + VIEW_PADDING;
  return { top: roundCoordinate(top), height: roundCoordinate(bottom - top) };
}

interface GenreHubSvgProps {
  geometry: MapGeometry;
  placed: PlacedGenre[];
  activeId: ProblemGenreId | null;
  focusedId: ProblemGenreId;
  onSelect: (id: ProblemGenreId) => void;
  onHover: (id: ProblemGenreId | null) => void;
  onKeyDown: (event: React.KeyboardEvent, id: ProblemGenreId) => void;
  registerButton: (id: ProblemGenreId, node: SVGGElement | null) => void;
  className?: string;
  gradientId: string;
}

function GenreHubSvg({
  geometry,
  placed,
  activeId,
  focusedId,
  onSelect,
  onHover,
  onKeyDown,
  registerButton,
  className,
  gradientId,
}: GenreHubSvgProps) {
  const { x: centreX, y: centreY } = hubCentre(geometry);
  const bounds = verticalBounds(placed, geometry);

  return (
    <svg
      viewBox={`0 ${bounds.top} ${geometry.width} ${bounds.height}`}
      className={cn('w-full h-auto select-none', className)}
      role="group"
      aria-label="Machine learning problem genres arranged around a central hub. Choose a genre to see the model families that solve it."
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={HUB_GRADIENT.from} />
          <stop offset="100%" stopColor={HUB_GRADIENT.to} />
        </linearGradient>
      </defs>

      {/* Spokes first, so pills draw over their ends. */}
      {placed.map(({ genre, x, y, pillWidth, isRightSide }) => {
        const isDimmed = activeId !== null && activeId !== genre.id;
        // Radial spokes curve out of the hub; grid spokes run down a centre
        // trunk and branch sideways, so no spoke passes behind another pill.
        const controlX = (centreX + x) / 2;
        const innerEdgeX = isRightSide ? x - pillWidth / 2 : x + pillWidth / 2;
        const spoke =
          geometry.layout === 'radial'
            ? `M ${centreX} ${centreY} C ${controlX} ${centreY}, ${controlX} ${y}, ${x} ${y}`
            : `M ${centreX} ${centreY} V ${y} H ${innerEdgeX}`;
        return (
          <path
            key={`spoke-${genre.id}`}
            d={spoke}
            fill="none"
            strokeWidth={2}
            strokeDasharray="6 5"
            className={cn(GENRE_COLORS[genre.id].spoke, 'transition-opacity duration-300', isDimmed && 'opacity-25')}
          />
        );
      })}

      <g aria-hidden="true">
        <rect
          x={centreX - geometry.hubWidth / 2}
          y={centreY - geometry.hubHeight / 2}
          width={geometry.hubWidth}
          height={geometry.hubHeight}
          rx={14}
          fill={`url(#${gradientId})`}
        />
        <text
          x={centreX}
          y={centreY - geometry.fontSize * 0.25}
          textAnchor="middle"
          className="fill-white font-bold"
          style={{ fontSize: geometry.fontSize + 2 }}
        >
          Machine
        </text>
        <text
          x={centreX}
          y={centreY + geometry.fontSize * 1.05}
          textAnchor="middle"
          className="fill-white font-bold"
          style={{ fontSize: geometry.fontSize + 2 }}
        >
          Learning
        </text>
      </g>

      {placed.map(({ genre, x, y, pillWidth, isRightSide }) => {
        const colors = GENRE_COLORS[genre.id];
        const isActive = activeId === genre.id;
        const isDimmed = activeId !== null && !isActive;
        const leafCount = genre.leaves.length;
        const columnTop = y - ((leafCount - 1) * geometry.leafSpacing) / 2;
        const bracketX = isRightSide ? x + pillWidth / 2 + geometry.leafGap / 2 : x - pillWidth / 2 - geometry.leafGap / 2;
        const textX = isRightSide ? bracketX + geometry.leafGap / 2 : bracketX - geometry.leafGap / 2;

        return (
          <g key={genre.id} className={cn('transition-opacity duration-300', isDimmed ? 'opacity-35' : 'opacity-100')}>
            {geometry.showLeaves && (
              <g>
                <path
                  d={`M ${isRightSide ? x + pillWidth / 2 : x - pillWidth / 2} ${y} H ${bracketX} M ${bracketX} ${columnTop} V ${columnTop + (leafCount - 1) * geometry.leafSpacing}`}
                  fill="none"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  className={colors.spoke}
                />
                {genre.leaves.map((leaf, leafIndex) => {
                  const leafY = columnTop + leafIndex * geometry.leafSpacing;
                  return (
                    <a key={leaf.slug} href={leaf.href} aria-label={`${leaf.modelName}, under ${genre.label}`} className="group/leaf">
                      <text
                        x={textX}
                        y={leafY + 4.5}
                        textAnchor={isRightSide ? 'start' : 'end'}
                        className={cn(colors.leaf, 'font-semibold group-hover/leaf:underline group-focus-visible/leaf:underline')}
                        style={{ fontSize: 13.5 }}
                      >
                        {leaf.label}
                        {leaf.examples.length > 0 && (
                          <tspan className="fill-zinc-500 dark:fill-zinc-400 font-normal">
                            {`  e.g. ${leaf.examples.join(', ')}`}
                          </tspan>
                        )}
                      </text>
                    </a>
                  );
                })}
              </g>
            )}

            <g
              ref={(node) => registerButton(genre.id, node)}
              role="button"
              tabIndex={genre.id === focusedId ? 0 : -1}
              aria-pressed={isActive}
              aria-label={`${genre.label}: ${genre.question}`}
              onClick={() => onSelect(genre.id)}
              onKeyDown={(event) => onKeyDown(event, genre.id)}
              onMouseEnter={() => onHover(genre.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(genre.id)}
              onBlur={() => onHover(null)}
              className="cursor-pointer outline-none group/pill"
            >
              <rect
                x={x - pillWidth / 2}
                y={y - geometry.pillHeight / 2}
                width={pillWidth}
                height={geometry.pillHeight}
                rx={geometry.pillHeight / 2}
                className={cn(
                  colors.pill,
                  'stroke-zinc-900 dark:stroke-white group-focus-visible/pill:stroke-blue-500',
                )}
                strokeWidth={isActive ? 3 : 0}
              />
              <rect
                x={x - pillWidth / 2 - 4}
                y={y - geometry.pillHeight / 2 - 4}
                width={pillWidth + 8}
                height={geometry.pillHeight + 8}
                rx={geometry.pillHeight / 2 + 4}
                fill="none"
                strokeWidth={2}
                className="stroke-transparent group-focus-visible/pill:stroke-blue-500"
              />
              <text
                x={x}
                y={y + geometry.fontSize * 0.35}
                textAnchor="middle"
                className="fill-white font-bold"
                style={{ fontSize: geometry.fontSize }}
              >
                {genre.label}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * The problem landscape as an interactive mind map: the genre of problem in
 * the middle ring, the model families that solve it fanning out, every family
 * a link to its full entry.
 *
 * Layout is computed from the data (angles from the genre count, leaf columns
 * from each genre's leaf count), so adding a genre or a leaf needs no
 * coordinates. Phones get the hub and genres only, at a size that stays
 * readable, with the leaves in the detail panel underneath, rather than a
 * shrunken or horizontally scrolling map.
 */
export default function ProblemGenreMap({ genres, explorerAnchorId }: ProblemGenreMapProps) {
  const prefersReducedMotion = useReducedMotion();
  const genreIds = useMemo(() => genres.map((genre) => genre.id), [genres]);
  const [selectedId, select] = useHashSelection<ProblemGenreId>('genre', genreIds, genreIds[0]);
  const [hoveredId, setHoveredId] = useState<ProblemGenreId | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const buttonRefs = useRef<Partial<Record<string, SVGGElement | null>>>({});

  const desktopPlaced = useMemo(() => placeGenres(genres, DESKTOP_GEOMETRY), [genres]);
  const compactPlaced = useMemo(() => placeGenres(genres, COMPACT_GEOMETRY), [genres]);

  // At rest the whole map is lit; hovering previews a genre, and a choice the
  // reader actually made keeps its genre lit.
  const activeId = hoveredId ?? (hasInteracted ? selectedId : null);
  const selected = genres.find((genre) => genre.id === selectedId) ?? genres[0];
  const selectedColors = GENRE_COLORS[selected.id];

  const handleSelect = (id: ProblemGenreId) => {
    setHasInteracted(true);
    select(id);
  };

  // Arrow keys move focus around the ring in clockwise order.
  const handleKeyDown = (event: React.KeyboardEvent, id: ProblemGenreId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect(id);
      return;
    }
    const offset = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (offset === 0) return;
    event.preventDefault();
    const index = genreIds.indexOf(id);
    const next = genreIds[(index + offset + genreIds.length) % genreIds.length];
    handleSelect(next);
    // The visible SVG is the one whose button is laid out; focus whichever exists.
    const candidates = [buttonRefs.current[`desktop-${next}`], buttonRefs.current[`compact-${next}`]];
    candidates.find((node) => node && node.getBoundingClientRect().width > 0)?.focus();
  };

  const handleMetricClick = (metricId: SimilarityMetricId) => (event: React.MouseEvent) => {
    event.preventDefault();
    selectViaHash('metric', metricId);
    scrollToAnchor(explorerAnchorId, { prefersReducedMotion: prefersReducedMotion ?? false });
  };

  const sharedSvgProps = {
    activeId,
    focusedId: selectedId,
    onSelect: handleSelect,
    onHover: setHoveredId,
    onKeyDown: handleKeyDown,
  };

  return (
    <div className="card-base p-4 sm:p-6">
      <GenreHubSvg
        {...sharedSvgProps}
        geometry={DESKTOP_GEOMETRY}
        placed={desktopPlaced}
        registerButton={(id, node) => {
          buttonRefs.current[`desktop-${id}`] = node;
        }}
        className="hidden md:block"
        gradientId="genre-hub-gradient-desktop"
      />
      <GenreHubSvg
        {...sharedSvgProps}
        geometry={COMPACT_GEOMETRY}
        placed={compactPlaced}
        registerButton={(id, node) => {
          buttonRefs.current[`compact-${id}`] = node;
        }}
        className="md:hidden"
        gradientId="genre-hub-gradient-compact"
      />

      <div
        id={`genre-panel-${selected.id}`}
        aria-live="polite"
        className="mt-4 border-t border-zinc-200 dark:border-zinc-800 pt-5"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('h-2.5 w-2.5 rounded-full', selectedColors.dot)} aria-hidden="true" />
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">{selected.label}</h3>
          {selected.anchorHref && (
            <Link
              href={selected.anchorHref}
              className={cn('ml-auto inline-flex items-center gap-1 text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline', FOCUS_RING)}
            >
              {selected.anchorLabel} <ArrowRight size={13} />
            </Link>
          )}
        </div>
        <p className="mt-1.5 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{selected.question}</p>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-micro text-zinc-400 mb-1">Output</dt>
            <dd className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{selected.output}</dd>
          </div>
          <div>
            <dt className="text-micro text-zinc-400 mb-1">Typically optimizes</dt>
            <dd className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{selected.typicalObjective}</dd>
          </div>
        </dl>

        <div className="mt-5">
          <span className="text-micro text-zinc-400 block mb-2">Model families</span>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {selected.leaves.map((leaf) => (
              <li key={leaf.slug}>
                <Link
                  href={leaf.href}
                  className={cn(
                    'block rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 transition-colors hover:border-blue-300 dark:hover:border-blue-700',
                    FOCUS_RING,
                  )}
                >
                  <span className="block text-sm font-semibold text-zinc-900 dark:text-white">{leaf.label}</span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                    {leaf.label === leaf.modelName ? leaf.categoryLabel : `${leaf.modelName} · ${leaf.categoryLabel}`}
                  </span>
                  {leaf.examples.length > 0 && (
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400">e.g. {leaf.examples.join(', ')}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5">
          <span className="text-micro text-zinc-400 block mb-2">How it measures similarity</span>
          <div className="flex flex-wrap gap-1.5">
            {selected.metrics.map((metric) => (
              <a
                key={metric.id}
                href={`#metric-${metric.id}`}
                onClick={handleMetricClick(metric.id)}
                className={cn('px-2 py-1 rounded border text-xs font-semibold transition-colors', selectedColors.chip, FOCUS_RING)}
              >
                {metric.label}
              </a>
            ))}
          </div>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{selected.metricRationale}</p>
        </div>
      </div>
    </div>
  );
}

export { GENRE_COLORS };
