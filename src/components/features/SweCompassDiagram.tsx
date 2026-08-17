'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type SweCompassAxis = 'end-to-end' | 'abstraction' | 'time';

interface SweCompassDiagramProps {
  /** Which axis, if any, is currently in view — null means "at rest": all
   *  three axes render at equal normal weight. This is also the correct
   *  pre-hydration/SSR state, since activeAxis starts null before any
   *  IntersectionObserver has fired. */
  activeAxis: SweCompassAxis | null;
}

// Reuses Badge.tsx's existing outline-color tokens (text-{color}-700 /
// dark:text-{color}-400) rather than inventing new colors — blue for
// end-to-end (the site's existing accent), purple for abstraction (already
// used in ArchitectureDiagram.tsx), amber for time (matches the shipped
// "Lessons Learned" boxes).
export const AXIS_COLOR_CLASSES: Record<SweCompassAxis, string> = {
  'end-to-end': 'text-blue-700 dark:text-blue-400',
  abstraction: 'text-purple-700 dark:text-purple-400',
  time: 'text-amber-700 dark:text-amber-400',
};

// Never hidden — dimmed axes fall back to this neutral, always-visible tone.
const DIMMED_CLASS = 'text-zinc-300 dark:text-zinc-700';

interface AxisGroupProps {
  axis: SweCompassAxis;
  activeAxis: SweCompassAxis | null;
  /** Main axis line, from the shared origin to the arrow tip. */
  line: { x1: number; y1: number; x2: number; y2: number };
  /** Open-chevron arrowhead, built the same way lucide's icons construct
   *  arrowheads — two short strokes meeting at the tip, not an SVG <marker>. */
  arrowhead: string;
  label: { x: number; y: number; anchor: 'start' | 'middle' | 'end'; title: string; subtitle: string };
}

const AxisGroup = ({ axis, activeAxis, line, arrowhead, label }: AxisGroupProps) => {
  const isActive = activeAxis === axis;
  const isDimmed = activeAxis !== null && !isActive;

  return (
    <g
      className={cn(
        'transition-colors duration-300',
        isDimmed ? DIMMED_CLASS : AXIS_COLOR_CLASSES[axis],
      )}
    >
      <line
        x1={line.x1}
        y1={line.y1}
        x2={line.x2}
        y2={line.y2}
        stroke="currentColor"
        strokeWidth={isActive ? 3 : 2}
        strokeLinecap="round"
      />
      <path
        d={arrowhead}
        stroke="currentColor"
        strokeWidth={isActive ? 3 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <text
        x={label.x}
        y={label.y}
        textAnchor={label.anchor}
        fill="currentColor"
        className={cn('text-[13px]', isActive ? 'font-bold' : 'font-semibold')}
      >
        {label.title}
      </text>
      <text
        x={label.x}
        y={label.y + 14}
        textAnchor={label.anchor}
        fill="currentColor"
        className="text-[10px] font-medium opacity-80"
      >
        {label.subtitle}
      </text>
    </g>
  );
};

/**
 * Hand-authored inline SVG recreation of the SWE Compass — three axes from
 * one shared origin (not a two-axis chart): end-to-end (→), abstraction (↑),
 * time (↙, diagonal).
 */
const SweCompassDiagram = ({ activeAxis }: SweCompassDiagramProps) => {
  // Shared origin all three axes radiate from.
  const origin = { x: 90, y: 170 };

  return (
    <svg
      // Width widened from 260 to 330 — at 260 the "End-to-end" title (13px)
      // and "design → ops" subtitle (10px), both anchored at x=236, ran past
      // the viewBox's right edge and got clipped. The other two axis labels
      // (abstraction, time) already fit within 260, so only the canvas width
      // changes; every line/arrowhead/other-label coordinate is untouched.
      viewBox="0 0 330 280"
      className="w-full max-w-md mx-auto"
      role="img"
      aria-label="The SWE Compass: three axes from one origin — end-to-end pointing right, abstraction pointing up, and time pointing diagonally down-left."
    >
      {/* Shared origin marker */}
      <circle cx={origin.x} cy={origin.y} r={3.5} className="fill-zinc-400 dark:fill-zinc-600" />

      <AxisGroup
        axis="end-to-end"
        activeAxis={activeAxis}
        line={{ x1: origin.x, y1: origin.y, x2: 230, y2: 170 }}
        arrowhead="M217.3,175.9 L230,170 L217.3,164.1"
        label={{ x: 236, y: 166, anchor: 'start', title: 'End-to-end', subtitle: 'design → ops' }}
      />

      <AxisGroup
        axis="abstraction"
        activeAxis={activeAxis}
        line={{ x1: origin.x, y1: origin.y, x2: 90, y2: 30 }}
        arrowhead="M95.9,42.7 L90,30 L84.1,42.7"
        label={{ x: 98, y: 26, anchor: 'start', title: 'Abstraction', subtitle: 'hardware → distributed' }}
      />

      <AxisGroup
        axis="time"
        activeAxis={activeAxis}
        line={{ x1: origin.x, y1: origin.y, x2: 25, y2: 235 }}
        arrowhead="M29.8,221.8 L25,235 L38.2,230.2"
        label={{ x: 10, y: 252, anchor: 'start', title: 'Time', subtitle: 'iteration' }}
      />
    </svg>
  );
};

export default SweCompassDiagram;
