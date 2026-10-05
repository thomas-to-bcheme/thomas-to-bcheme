'use client';

import { useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import {
  chebyshev,
  correlationCovariance,
  cosine,
  dot,
  euclidean,
  mahalanobis2d,
  manhattan,
  norm,
  type Covariance2d,
  type Vector,
} from '@/lib/similarity';
import type { SimilarityMetricId } from '@/constants/aiMl/types';

/** The metrics this view can draw; the explorer routes the rest elsewhere. */
export type PlaneMetricId = Extract<
  SimilarityMetricId,
  'euclidean' | 'manhattan' | 'chebyshev' | 'dot-product' | 'cosine' | 'mahalanobis'
>;

interface VectorPlaneViewProps {
  metricId: PlaneMetricId;
  metricLabels: Record<PlaneMetricId, string>;
}

const VIEW_SIZE = 360;
const AXIS_LIMIT = 4;
const UNITS_TO_PX = (VIEW_SIZE / 2 - 20) / AXIS_LIMIT;
const SNAP_STEP = 0.25;
const CONTOUR_SAMPLES = 180;
const RHO_LIMIT = 0.9;
const RHO_STEP = 0.05;
const DEFAULT_A: [number, number] = [3, 1];
const DEFAULT_B: [number, number] = [1, 2.5];
const DEFAULT_RHO = 0.6;
const DECIMALS = 3;

const READOUT_ORDER: PlaneMetricId[] = ['euclidean', 'manhattan', 'chebyshev', 'dot-product', 'cosine', 'mahalanobis'];

type HandleId = 'a' | 'b';

function toSvg([x, y]: Vector): [number, number] {
  return [VIEW_SIZE / 2 + x * UNITS_TO_PX, VIEW_SIZE / 2 - y * UNITS_TO_PX];
}

function clampSnap(value: number): number {
  const snapped = Math.round(value / SNAP_STEP) * SNAP_STEP;
  return Math.min(AXIS_LIMIT, Math.max(-AXIS_LIMIT, snapped));
}

function format(value: number | null): string {
  return value === null ? 'undefined' : value.toFixed(DECIMALS);
}

function pathFrom(points: Vector[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${toSvg(point).join(' ')}`).join(' ') + ' Z';
}

/**
 * Length of the direction u under each norm-based metric. Every distance
 * "ball" is then the same construction: walk round the circle of directions
 * and scale each to the radius in that norm. The circle, diamond, square and
 * ellipse fall out of the metric's definition instead of being drawn by hand.
 */
function directionLength(metricId: PlaneMetricId, u: Vector, sigma: Covariance2d): number | null {
  const origin = [0, 0];
  switch (metricId) {
    case 'euclidean':
      return euclidean(u, origin);
    case 'manhattan':
      return manhattan(u, origin);
    case 'chebyshev':
      return chebyshev(u, origin);
    case 'mahalanobis':
      return mahalanobis2d(u, origin, sigma);
    default:
      return null;
  }
}

function isoDistanceContour(metricId: PlaneMetricId, centre: Vector, radius: number, sigma: Covariance2d): Vector[] {
  return Array.from({ length: CONTOUR_SAMPLES }, (_, sample) => {
    const angle = (2 * Math.PI * sample) / CONTOUR_SAMPLES;
    const direction = [Math.cos(angle), Math.sin(angle)];
    const length = directionLength(metricId, direction, sigma) ?? 1;
    return [centre[0] + (radius * direction[0]) / length, centre[1] + (radius * direction[1]) / length];
  });
}

/** What the current overlay means, in one sentence, for the caption. */
const OVERLAY_CAPTIONS: Record<PlaneMetricId, string> = {
  euclidean: 'The straight segment is the distance. The circle through a is every point exactly that far from b.',
  manhattan: 'Distance is walked along the axes. The diamond through a is every point the same L1 distance from b.',
  chebyshev: 'Only the longer leg counts. The square through a is every point the same L∞ distance from b.',
  'dot-product': 'a is projected onto b. Every point on the dashed level line has the same dot product with b as a.',
  cosine: 'Both vectors are pushed onto the unit circle and only the angle remains. Any point on the rays shares a’s cosine with b.',
  mahalanobis: 'Correlation tilts and stretches the ball into the data’s covariance ellipse; a step along the correlated diagonal counts for less.',
};

/**
 * Two draggable vectors on a plane, with the selected metric drawn as geometry:
 * the segment, staircase, projection or angle it actually computes, and the
 * level set through a. "Same points, different notion of near" becomes visible
 * as the level set changes shape under the same two points.
 */
export default function VectorPlaneView({ metricId, metricLabels }: VectorPlaneViewProps) {
  const [vectors, setVectors] = useState<Record<HandleId, [number, number]>>({ a: DEFAULT_A, b: DEFAULT_B });
  const [rho, setRho] = useState(DEFAULT_RHO);
  const [dragging, setDragging] = useState<HandleId | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { a, b } = vectors;
  const sigma = correlationCovariance(rho);

  const values: Record<PlaneMetricId, number | null> = {
    euclidean: euclidean(a, b),
    manhattan: manhattan(a, b),
    chebyshev: chebyshev(a, b),
    'dot-product': dot(a, b),
    cosine: cosine(a, b),
    mahalanobis: mahalanobis2d(a, b, sigma),
  };

  const moveHandle = (handle: HandleId, next: [number, number]) =>
    setVectors((current) => ({ ...current, [handle]: [clampSnap(next[0]), clampSnap(next[1])] }));

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging || !svgRef.current) return;
    const matrix = svgRef.current.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    moveHandle(dragging, [(point.x - VIEW_SIZE / 2) / UNITS_TO_PX, (VIEW_SIZE / 2 - point.y) / UNITS_TO_PX]);
  };

  const handleKeyDown = (handle: HandleId) => (event: React.KeyboardEvent) => {
    const deltas: Record<string, [number, number]> = {
      ArrowUp: [0, SNAP_STEP],
      ArrowDown: [0, -SNAP_STEP],
      ArrowLeft: [-SNAP_STEP, 0],
      ArrowRight: [SNAP_STEP, 0],
    };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    const current = vectors[handle];
    moveHandle(handle, [current[0] + delta[0], current[1] + delta[1]]);
  };

  const [ax, ay] = toSvg(a);
  const [bx, by] = toSvg(b);
  const [ox, oy] = toSvg([0, 0]);

  const overlay = renderOverlay({ metricId, a, b, sigma, value: values[metricId] });

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
          className="w-full max-w-[460px] mx-auto h-auto touch-none select-none rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950"
          onPointerMove={handlePointerMove}
          onPointerUp={() => setDragging(null)}
          onPointerLeave={() => setDragging(null)}
          role="group"
          aria-label={`Vector plane showing ${metricLabels[metricId]} between a = (${a.join(', ')}) and b = (${b.join(', ')}). Use the arrow keys on each handle to move it.`}
        >
          <defs>
            <clipPath id="vector-plane-clip">
              <rect x={0} y={0} width={VIEW_SIZE} height={VIEW_SIZE} />
            </clipPath>
          </defs>

          {Array.from({ length: AXIS_LIMIT * 2 + 1 }, (_, index) => index - AXIS_LIMIT).map((tick) => {
            const [gx] = toSvg([tick, 0]);
            const [, gy] = toSvg([0, tick]);
            return (
              <g key={tick} className="stroke-zinc-200 dark:stroke-zinc-800" strokeWidth={tick === 0 ? 0 : 1}>
                <line x1={gx} y1={0} x2={gx} y2={VIEW_SIZE} />
                <line x1={0} y1={gy} x2={VIEW_SIZE} y2={gy} />
              </g>
            );
          })}
          <line x1={ox} y1={0} x2={ox} y2={VIEW_SIZE} className="stroke-zinc-400 dark:stroke-zinc-600" strokeWidth={1.5} />
          <line x1={0} y1={oy} x2={VIEW_SIZE} y2={oy} className="stroke-zinc-400 dark:stroke-zinc-600" strokeWidth={1.5} />

          <g clipPath="url(#vector-plane-clip)">{overlay}</g>

          {/* Position vectors from the origin. */}
          <line x1={ox} y1={oy} x2={ax} y2={ay} className="stroke-blue-600 dark:stroke-blue-400" strokeWidth={2} />
          <line x1={ox} y1={oy} x2={bx} y2={by} className="stroke-rose-600 dark:stroke-rose-400" strokeWidth={2} />

          {(['a', 'b'] as const).map((handle) => {
            const [hx, hy] = handle === 'a' ? [ax, ay] : [bx, by];
            const color = handle === 'a' ? 'fill-blue-600 dark:fill-blue-400' : 'fill-rose-600 dark:fill-rose-400';
            return (
              <g key={handle}>
                <circle
                  cx={hx}
                  cy={hy}
                  r={11}
                  role="slider"
                  tabIndex={0}
                  aria-label={`Vector ${handle}`}
                  aria-valuetext={`(${vectors[handle].join(', ')})`}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    setDragging(handle);
                  }}
                  onKeyDown={handleKeyDown(handle)}
                  className={cn(
                    color,
                    'cursor-grab active:cursor-grabbing stroke-white dark:stroke-black outline-none focus-visible:stroke-blue-300',
                  )}
                  strokeWidth={2.5}
                />
                <text x={hx} y={hy + 4} textAnchor="middle" className="fill-white dark:fill-black font-bold pointer-events-none" style={{ fontSize: 12 }}>
                  {handle}
                </text>
              </g>
            );
          })}
        </svg>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 text-center">
          Drag <span className="font-bold text-blue-700 dark:text-blue-400">a</span> and{' '}
          <span className="font-bold text-rose-700 dark:text-rose-400">b</span>, or focus one and use the arrow keys.
        </p>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{OVERLAY_CAPTIONS[metricId]}</p>

        {metricId === 'mahalanobis' && (
          <label className="block">
            <span className="text-micro text-zinc-400 flex justify-between mb-2">
              <span>Feature correlation ρ</span>
              <span className="font-mono normal-case">{rho.toFixed(2)}</span>
            </span>
            <input
              type="range"
              min={-RHO_LIMIT}
              max={RHO_LIMIT}
              step={RHO_STEP}
              value={rho}
              onChange={(event) => setRho(Number(event.target.value))}
              className="slider-input"
            />
            <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
              Σ = [[1, ρ], [ρ, 1]]. At ρ = 0, Mahalanobis equals Euclidean.
            </span>
          </label>
        )}

        <div>
          <span className="text-micro text-zinc-400 block mb-2">Same two points, every metric</span>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
            {READOUT_ORDER.map((id) => (
              <li
                key={id}
                className={cn(
                  'flex items-baseline justify-between px-3 py-1.5 text-sm',
                  id === metricId && 'bg-blue-50 dark:bg-blue-900/20 font-semibold',
                )}
              >
                <span className={id === metricId ? 'text-blue-800 dark:text-blue-300' : 'text-zinc-600 dark:text-zinc-400'}>
                  {metricLabels[id]}
                </span>
                <span className="font-mono text-zinc-900 dark:text-white">{format(values[id])}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            |a| = {norm(a).toFixed(DECIMALS)}, |b| = {norm(b).toFixed(DECIMALS)}. Scale a and the distances change, but cosine does not.
          </p>
        </div>
      </div>
    </div>
  );
}

interface OverlayInput {
  metricId: PlaneMetricId;
  a: Vector;
  b: Vector;
  sigma: Covariance2d;
  value: number | null;
}

const LEVEL_SET_CLASS = 'fill-amber-400/10 stroke-amber-500 dark:stroke-amber-400';
const MEASURE_CLASS = 'stroke-emerald-600 dark:stroke-emerald-400';

function renderOverlay({ metricId, a, b, sigma, value }: OverlayInput): React.ReactNode {
  const [ax, ay] = toSvg(a);
  const [bx, by] = toSvg(b);
  const [ox, oy] = toSvg([0, 0]);

  if (metricId === 'dot-product') {
    const bLengthSquared = dot(b, b);
    if (bLengthSquared === 0) return null;
    const scale = dot(a, b) / bLengthSquared;
    const projection = [b[0] * scale, b[1] * scale];
    const [px, py] = toSvg(projection);
    const reach = AXIS_LIMIT * 3;
    const unitB = [b[0] / Math.sqrt(bLengthSquared), b[1] / Math.sqrt(bLengthSquared)];
    const perpendicular = [-unitB[1], unitB[0]];
    const [l1x, l1y] = toSvg([projection[0] + perpendicular[0] * reach, projection[1] + perpendicular[1] * reach]);
    const [l2x, l2y] = toSvg([projection[0] - perpendicular[0] * reach, projection[1] - perpendicular[1] * reach]);
    const [e1x, e1y] = toSvg([unitB[0] * reach, unitB[1] * reach]);
    const [e2x, e2y] = toSvg([-unitB[0] * reach, -unitB[1] * reach]);
    return (
      <g>
        <line x1={e1x} y1={e1y} x2={e2x} y2={e2y} className="stroke-rose-300 dark:stroke-rose-800" strokeDasharray="2 4" />
        <line x1={l1x} y1={l1y} x2={l2x} y2={l2y} className={LEVEL_SET_CLASS} strokeDasharray="6 4" strokeWidth={1.5} />
        <line x1={ox} y1={oy} x2={px} y2={py} className={MEASURE_CLASS} strokeWidth={5} strokeLinecap="round" opacity={0.6} />
        <circle cx={px} cy={py} r={3.5} className="fill-emerald-600 dark:fill-emerald-400" />
      </g>
    );
  }

  if (metricId === 'cosine') {
    const radius = UNITS_TO_PX;
    const angleA = Math.atan2(a[1], a[0]);
    const angleB = Math.atan2(b[1], b[0]);
    const unitPoint = (angle: number) => toSvg([Math.cos(angle), Math.sin(angle)]);
    const [uax, uay] = unitPoint(angleA);
    const [ubx, uby] = unitPoint(angleB);
    let sweep = angleA - angleB;
    while (sweep > Math.PI) sweep -= 2 * Math.PI;
    while (sweep < -Math.PI) sweep += 2 * Math.PI;
    const [arcStartX, arcStartY] = unitPoint(angleB);
    const [arcEndX, arcEndY] = unitPoint(angleB + sweep);
    // SVG y points down, so a positive (counter-clockwise) math angle sweeps with flag 0.
    const sweepFlag = sweep > 0 ? 0 : 1;
    const reach = AXIS_LIMIT * 3;
    const rays = value === null ? [] : [angleB + sweep, angleB - sweep];
    return (
      <g>
        <circle cx={ox} cy={oy} r={radius} fill="none" className="stroke-zinc-400 dark:stroke-zinc-600" strokeDasharray="3 3" />
        {rays.map((angle, index) => {
          const [rx, ry] = toSvg([Math.cos(angle) * reach, Math.sin(angle) * reach]);
          return <line key={index} x1={ox} y1={oy} x2={rx} y2={ry} className={LEVEL_SET_CLASS} strokeDasharray="6 4" strokeWidth={1.5} />;
        })}
        {value !== null && (
          <path
            d={`M ${ox} ${oy} L ${arcStartX} ${arcStartY} A ${radius} ${radius} 0 0 ${sweepFlag} ${arcEndX} ${arcEndY} Z`}
            className="fill-emerald-500/25 stroke-emerald-600 dark:stroke-emerald-400"
          />
        )}
        <circle cx={uax} cy={uay} r={4} className="fill-blue-600 dark:fill-blue-400" />
        <circle cx={ubx} cy={uby} r={4} className="fill-rose-600 dark:fill-rose-400" />
      </g>
    );
  }

  const radius = value ?? 0;
  const contour = radius > 0 ? pathFrom(isoDistanceContour(metricId, b, radius, sigma)) : null;
  const corner = toSvg([a[0], b[1]]);
  const legX = Math.abs(a[0] - b[0]);
  const legY = Math.abs(a[1] - b[1]);

  return (
    <g>
      {contour && <path d={contour} className={LEVEL_SET_CLASS} strokeWidth={1.5} strokeDasharray="6 4" />}
      {metricId === 'euclidean' || metricId === 'mahalanobis' ? (
        <line x1={ax} y1={ay} x2={bx} y2={by} className={MEASURE_CLASS} strokeWidth={3} />
      ) : (
        <g fill="none">
          <line
            x1={bx}
            y1={by}
            x2={corner[0]}
            y2={corner[1]}
            className={MEASURE_CLASS}
            strokeWidth={metricId === 'chebyshev' && legX < legY ? 1.5 : 3.5}
            opacity={metricId === 'chebyshev' && legX < legY ? 0.4 : 1}
          />
          <line
            x1={corner[0]}
            y1={corner[1]}
            x2={ax}
            y2={ay}
            className={MEASURE_CLASS}
            strokeWidth={metricId === 'chebyshev' && legY < legX ? 1.5 : 3.5}
            opacity={metricId === 'chebyshev' && legY < legX ? 0.4 : 1}
          />
        </g>
      )}
    </g>
  );
}
