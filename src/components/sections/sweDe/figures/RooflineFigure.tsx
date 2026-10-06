import ScrollableDiagram from './ScrollableDiagram';
import type { RooflineFigureSpec } from '@/constants/sweDe';

const VIEW_WIDTH = 480;
const VIEW_HEIGHT = 300;
const PLOT = { left: 56, right: 464, top: 16, bottom: 244 };
/** Log10 of the intensity axis ends: 0.1 to 1000 operations per byte. */
const INTENSITY_LOG_MIN = -1;
const INTENSITY_LOG_MAX = 3;
/** Headroom above the compute roof, in decades, so the roof line is not on the frame. */
const PERFORMANCE_HEADROOM_DECADES = 0.35;

const AXIS_CLASS = 'stroke-zinc-400 dark:stroke-zinc-600';
const TEXT_CLASS = 'fill-zinc-700 dark:fill-zinc-300';
const MUTED_TEXT_CLASS = 'fill-zinc-500 dark:fill-zinc-400';

/**
 * Roofline model: performance rises with arithmetic intensity until it hits
 * the compute peak. Points left of the ridge are bound by memory bandwidth,
 * points right of it by compute. Geometry is derived from the spec's numbers,
 * which are illustrative and never a benchmark.
 */
const RooflineFigure = ({
  peakComputeLabel,
  bandwidthLabel,
  peakGflops,
  bandwidthGBs,
  points,
}: Pick<RooflineFigureSpec, 'peakComputeLabel' | 'bandwidthLabel' | 'peakGflops' | 'bandwidthGBs' | 'points'>) => {
  const plotWidth = PLOT.right - PLOT.left;
  const plotHeight = PLOT.bottom - PLOT.top;
  const performanceLogMin = Math.log10(bandwidthGBs * 10 ** INTENSITY_LOG_MIN);
  const performanceLogMax = Math.log10(peakGflops) + PERFORMANCE_HEADROOM_DECADES;

  const xOf = (intensity: number) => PLOT.left + ((Math.log10(intensity) - INTENSITY_LOG_MIN) / (INTENSITY_LOG_MAX - INTENSITY_LOG_MIN)) * plotWidth;
  const yOf = (gflops: number) => PLOT.bottom - ((Math.log10(gflops) - performanceLogMin) / (performanceLogMax - performanceLogMin)) * plotHeight;
  const attainable = (intensity: number) => Math.min(peakGflops, bandwidthGBs * intensity);

  const ridgeIntensity = peakGflops / bandwidthGBs;
  const ridgeX = xOf(ridgeIntensity);
  const rampStart = `${xOf(10 ** INTENSITY_LOG_MIN)},${yOf(attainable(10 ** INTENSITY_LOG_MIN))}`;
  const roofPath = `M ${rampStart} L ${ridgeX},${yOf(peakGflops)} L ${PLOT.right},${yOf(peakGflops)}`;

  return (
    <ScrollableDiagram>
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="mx-auto h-auto w-full min-w-[30rem] max-w-xl" role="presentation" aria-hidden="true">
        <line x1={PLOT.left} y1={PLOT.top} x2={PLOT.left} y2={PLOT.bottom} className={AXIS_CLASS} strokeWidth={1.5} />
        <line x1={PLOT.left} y1={PLOT.bottom} x2={PLOT.right} y2={PLOT.bottom} className={AXIS_CLASS} strokeWidth={1.5} />

        <line x1={ridgeX} y1={PLOT.top} x2={ridgeX} y2={PLOT.bottom} className={AXIS_CLASS} strokeWidth={1} strokeDasharray="4 4" />
        <path d={roofPath} fill="none" className="stroke-blue-600 dark:stroke-blue-400" strokeWidth={2.5} strokeLinejoin="round" />

        <text x={PLOT.left + 8} y={PLOT.top + 12} className={`${MUTED_TEXT_CLASS} text-[10px]`}>
          Memory-bound
        </text>
        <text x={PLOT.right - 8} y={PLOT.top + 12} textAnchor="end" className={`${MUTED_TEXT_CLASS} text-[10px]`}>
          Compute-bound
        </text>
        <text x={PLOT.right - 8} y={yOf(peakGflops) - 6} textAnchor="end" className={`${TEXT_CLASS} text-[10px] font-semibold`}>
          {peakComputeLabel}
        </text>
        <text x={PLOT.right - 8} y={PLOT.bottom - 12} textAnchor="end" className={`${TEXT_CLASS} text-[10px] font-semibold`}>
          Slope: {bandwidthLabel}
        </text>

        {points.map((point) => {
          const pointX = xOf(point.intensity);
          const pointY = yOf(attainable(point.intensity));
          const isComputeBound = point.intensity > ridgeIntensity;
          return (
            <g key={point.id}>
              <circle cx={pointX} cy={pointY} r={5} className="fill-emerald-600 stroke-white dark:fill-emerald-400 dark:stroke-zinc-900" strokeWidth={1.5} />
              <text
                x={isComputeBound ? pointX : pointX + 9}
                y={pointY + 18}
                textAnchor={isComputeBound ? 'middle' : 'start'}
                className={`${TEXT_CLASS} text-[10px]`}
              >
                {point.label}
              </text>
            </g>
          );
        })}

        <text x={(PLOT.left + PLOT.right) / 2} y={VIEW_HEIGHT - 28} textAnchor="middle" className={`${MUTED_TEXT_CLASS} text-[11px]`}>
          Arithmetic intensity (operations per byte moved, log scale)
        </text>
        <text
          x={14}
          y={(PLOT.top + PLOT.bottom) / 2}
          textAnchor="middle"
          transform={`rotate(-90 14 ${(PLOT.top + PLOT.bottom) / 2})`}
          className={`${MUTED_TEXT_CLASS} text-[11px]`}
        >
          Attainable performance (log scale)
        </text>
      </svg>
    </ScrollableDiagram>
  );
};

export default RooflineFigure;
