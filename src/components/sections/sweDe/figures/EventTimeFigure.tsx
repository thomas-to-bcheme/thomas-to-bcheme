import type { EventTimeFigureSpec } from '@/constants/sweDe';

const VIEW_WIDTH = 420;
const VIEW_HEIGHT = 310;
const PLOT = { left: 52, right: 400, top: 16, bottom: 254 };

const AXIS_CLASS = 'stroke-zinc-400 dark:stroke-zinc-600';
const MUTED_TEXT_CLASS = 'fill-zinc-500 dark:fill-zinc-400';

type EventStatus = 'on-time' | 'late' | 'other-window';

const STATUS_FILL: Record<EventStatus, string> = {
  'on-time': 'fill-emerald-600 dark:fill-emerald-400',
  late: 'fill-rose-600 dark:fill-rose-400',
  'other-window': 'fill-zinc-400 dark:fill-zinc-500',
};

const STATUS_LABEL: Record<EventStatus, string> = {
  'on-time': 'Arrived before the watermark: counted in its window',
  late: 'Arrived after the watermark: its window already closed',
  'other-window': 'Belongs to a later window',
};

/**
 * Event time (when it happened) against processing time (when the system saw
 * it). On the diagonal an event arrives instantly; below it, delay. Once the
 * watermark passes the window end, events from that window that arrive later
 * are late. Status is derived from the spec, never stored.
 */
const EventTimeFigure = ({
  windowEnd,
  watermarkPassesAt,
  axisMax,
  events,
}: Pick<EventTimeFigureSpec, 'windowEnd' | 'watermarkPassesAt' | 'axisMax' | 'events'>) => {
  const xOf = (processingTime: number) => PLOT.left + (processingTime / axisMax) * (PLOT.right - PLOT.left);
  const yOf = (eventTime: number) => PLOT.bottom - (eventTime / axisMax) * (PLOT.bottom - PLOT.top);

  const statusOf = (event: EventTimeFigureSpec['events'][number]): EventStatus => {
    if (event.eventTime > windowEnd) return 'other-window';
    return event.processingTime > watermarkPassesAt ? 'late' : 'on-time';
  };

  const statuses = Object.keys(STATUS_LABEL) as EventStatus[];

  return (
    <div>
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="mx-auto h-auto w-full max-w-lg" role="presentation" aria-hidden="true">
        <line x1={PLOT.left} y1={PLOT.top} x2={PLOT.left} y2={PLOT.bottom} className={AXIS_CLASS} strokeWidth={1.5} />
        <line x1={PLOT.left} y1={PLOT.bottom} x2={PLOT.right} y2={PLOT.bottom} className={AXIS_CLASS} strokeWidth={1.5} />

        <line x1={xOf(0)} y1={yOf(0)} x2={xOf(axisMax)} y2={yOf(axisMax)} className={AXIS_CLASS} strokeWidth={1} strokeDasharray="5 4" />
        <text x={xOf(axisMax) - 6} y={yOf(axisMax) + 14} textAnchor="end" className={`${MUTED_TEXT_CLASS} text-[10px]`}>
          No delay
        </text>

        <line x1={PLOT.left} y1={yOf(windowEnd)} x2={PLOT.right} y2={yOf(windowEnd)} className="stroke-blue-500 dark:stroke-blue-400" strokeWidth={1.5} strokeDasharray="2 3" />
        <text x={PLOT.left + 6} y={yOf(windowEnd) - 5} className="fill-blue-700 text-[10px] font-semibold dark:fill-blue-300">
          Window ends
        </text>

        <line x1={xOf(watermarkPassesAt)} y1={PLOT.top} x2={xOf(watermarkPassesAt)} y2={PLOT.bottom} className="stroke-amber-500 dark:stroke-amber-400" strokeWidth={1.5} />
        <text x={xOf(watermarkPassesAt) + 5} y={PLOT.top + 11} className="fill-amber-700 text-[10px] font-semibold dark:fill-amber-300">
          Watermark passes window end
        </text>

        {events.map((event) => (
          <circle
            key={event.id}
            cx={xOf(event.processingTime)}
            cy={yOf(event.eventTime)}
            r={5}
            className={`${STATUS_FILL[statusOf(event)]} stroke-white dark:stroke-zinc-900`}
            strokeWidth={1.5}
          />
        ))}

        <text x={(PLOT.left + PLOT.right) / 2} y={VIEW_HEIGHT - 30} textAnchor="middle" className={`${MUTED_TEXT_CLASS} text-[11px]`}>
          Processing time (when the system sees the event)
        </text>
        <text
          x={14}
          y={(PLOT.top + PLOT.bottom) / 2}
          textAnchor="middle"
          transform={`rotate(-90 14 ${(PLOT.top + PLOT.bottom) / 2})`}
          className={`${MUTED_TEXT_CLASS} text-[11px]`}
        >
          Event time (when it happened)
        </text>
      </svg>
      <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
        {statuses.map((status) => {
          const count = events.filter((event) => statusOf(event) === status).length;
          if (count === 0) return null;
          return (
            <li key={status} className="flex items-center gap-1.5">
              <svg width="10" height="10" aria-hidden="true" className={STATUS_FILL[status]}>
                <circle cx="5" cy="5" r="5" />
              </svg>
              {STATUS_LABEL[status]} ({count})
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default EventTimeFigure;
