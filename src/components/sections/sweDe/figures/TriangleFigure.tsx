import type { TriangleFigureSpec } from '@/constants/sweDe';

const VIEW_WIDTH = 380;
const VIEW_HEIGHT = 300;
const VERTICES: [number, number][] = [
  [190, 34],
  [48, 262],
  [332, 262],
];
const LABEL_FLIP_X = 190;

const markerPosition = (weights: [number, number, number]): [number, number] => {
  const x = weights.reduce((sum, weight, corner) => sum + weight * VERTICES[corner][0], 0);
  const y = weights.reduce((sum, weight, corner) => sum + weight * VERTICES[corner][1], 0);
  return [x, y];
};

/**
 * A trade-off triangle: each corner is a property you can optimize, and each
 * marker sits nearer the corners it favors (barycentric weights). The corner
 * descriptions are real text below the drawing, so the figure never depends on
 * the picture alone.
 */
const TriangleFigure = ({ corners, markers }: Pick<TriangleFigureSpec, 'corners' | 'markers'>) => (
  <div>
    <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="mx-auto h-auto w-full max-w-md" role="presentation" aria-hidden="true">
      <polygon
        points={VERTICES.map(([x, y]) => `${x},${y}`).join(' ')}
        className="fill-zinc-50 stroke-zinc-400 dark:fill-zinc-900 dark:stroke-zinc-600"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {corners.map((corner, index) => {
        const [x, y] = VERTICES[index];
        const isTop = index === 0;
        return (
          <text
            key={corner.id}
            x={x}
            y={isTop ? y - 10 : y + 20}
            textAnchor="middle"
            className="fill-zinc-900 text-[12px] font-bold dark:fill-white"
          >
            {corner.label}
          </text>
        );
      })}
      {markers.map((marker) => {
        const [x, y] = markerPosition(marker.weights);
        const isRightOfCenter = x > LABEL_FLIP_X;
        return (
          <g key={marker.id}>
            <circle cx={x} cy={y} r={6} className={`fill-blue-600 stroke-white dark:fill-blue-400 dark:stroke-zinc-900`} strokeWidth={1.5} />
            <text
              x={isRightOfCenter ? x + 10 : x - 10}
              y={y + 4}
              textAnchor={isRightOfCenter ? 'start' : 'end'}
              className="fill-zinc-800 text-[11px] font-semibold dark:fill-zinc-200"
            >
              {marker.label}
            </text>
          </g>
        );
      })}
    </svg>
    <dl className="mt-3 grid gap-2 sm:grid-cols-3">
      {corners.map((corner) => (
        <div key={corner.id}>
          <dt className="text-xs font-bold text-zinc-900 dark:text-white">{corner.label}</dt>
          <dd className="text-xs leading-snug text-zinc-500 dark:text-zinc-400">{corner.detail}</dd>
        </div>
      ))}
    </dl>
  </div>
);

export default TriangleFigure;
