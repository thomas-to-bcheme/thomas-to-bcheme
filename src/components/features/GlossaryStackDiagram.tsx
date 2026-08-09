'use client';

import React from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { scrollToAnchor } from '@/lib/scrollToAnchor';
import { GLOSSARY_CATEGORIES, getTermsByCategory, type GlossaryCategoryId } from '@/constants/glossary';

interface GlossaryStackDiagramProps {
  /** Currently in-view category, or null at rest (no dim/highlight). */
  activeCategoryId: GlossaryCategoryId | null;
}

// Bottom-to-top reading order matches plan §4's cross-section: two
// independent Foundations bands at the bottom (kept visually distinct, never
// fused into one shape), then the ML Lifecycle in dependency order, ending
// in the thinnest band — the evaluation feedback loop — at the top. Declared
// top-to-bottom here since that's SVG y-order.
const STACK_ROWS: GlossaryCategoryId[][] = [
  ['evaluation-observability'],
  ['mlops-infra'],
  ['data-science-ml', 'ai-ml-engineering'],
  ['data-engineering'],
  ['systems-design', 'gpu-cuda'],
];

// Full literal Tailwind class strings (not string-interpolated) — Tailwind's
// build-time scanner only picks up classnames it can find verbatim in
// source, so a `bg-${hue}-50` template would silently fail to compile.
// Exported so GlossaryBrowser's per-category icon chips use the same hue
// per category as this diagram, instead of drifting to a second palette.
export const CATEGORY_ICON_CHIP_CLASSES: Record<GlossaryCategoryId, { chip: string; icon: string }> = {
  'gpu-cuda': { chip: 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800/50', icon: 'text-purple-600 dark:text-purple-400' },
  'systems-design': { chip: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50', icon: 'text-blue-600 dark:text-blue-400' },
  'data-engineering': { chip: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50', icon: 'text-emerald-600 dark:text-emerald-400' },
  'data-science-ml': { chip: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/50', icon: 'text-amber-600 dark:text-amber-400' },
  'ai-ml-engineering': { chip: 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/50', icon: 'text-rose-600 dark:text-rose-400' },
  'mlops-infra': { chip: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/50', icon: 'text-indigo-600 dark:text-indigo-400' },
  'evaluation-observability': { chip: 'bg-teal-50 dark:bg-teal-900/20 border-teal-100 dark:border-teal-800/50', icon: 'text-teal-600 dark:text-teal-400' },
};

const CATEGORY_COLOR_CLASSES: Record<GlossaryCategoryId, { fill: string; stroke: string; text: string }> = {
  'gpu-cuda': { fill: 'fill-purple-100 dark:fill-purple-900/30', stroke: 'stroke-purple-300 dark:stroke-purple-700', text: 'fill-purple-900 dark:fill-purple-200' },
  'systems-design': { fill: 'fill-blue-100 dark:fill-blue-900/30', stroke: 'stroke-blue-300 dark:stroke-blue-700', text: 'fill-blue-900 dark:fill-blue-200' },
  'data-engineering': { fill: 'fill-emerald-100 dark:fill-emerald-900/30', stroke: 'stroke-emerald-300 dark:stroke-emerald-700', text: 'fill-emerald-900 dark:fill-emerald-200' },
  'data-science-ml': { fill: 'fill-amber-100 dark:fill-amber-900/30', stroke: 'stroke-amber-300 dark:stroke-amber-700', text: 'fill-amber-900 dark:fill-amber-200' },
  'ai-ml-engineering': { fill: 'fill-rose-100 dark:fill-rose-900/30', stroke: 'stroke-rose-300 dark:stroke-rose-700', text: 'fill-rose-900 dark:fill-rose-200' },
  'mlops-infra': { fill: 'fill-indigo-100 dark:fill-indigo-900/30', stroke: 'stroke-indigo-300 dark:stroke-indigo-700', text: 'fill-indigo-900 dark:fill-indigo-200' },
  'evaluation-observability': { fill: 'fill-teal-100 dark:fill-teal-900/30', stroke: 'stroke-teal-300 dark:stroke-teal-700', text: 'fill-teal-900 dark:fill-teal-200' },
};

const VIEW_WIDTH = 600;
const GAP = 6;
const MIN_ROW_HEIGHT = 46;
const MAX_ROW_HEIGHT = 86;

function labelFor(id: GlossaryCategoryId): string {
  return GLOSSARY_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

/**
 * The signature element: a silicon-to-product cross-section, not a generic
 * boxes-and-arrows pipeline. Each band's height and (within a shared row)
 * width is computed from getTermsByCategory().length — live data, not a
 * hand-tuned illustration — so the diagram can't drift from what the
 * categories actually contain. Clicking a band scrolls to and focuses that
 * category's section (scrollToAnchor handles both).
 *
 * Deliberately renders one interactive SVG at every breakpoint rather than
 * swapping in a separate static mobile variant: unlike a control-dense UI,
 * every band here is already a large full- or half-width region (min 46px
 * tall), so mobile tap targets stay generous without a second rendering
 * path — the viewBox scales the whole diagram down responsively instead.
 */
const GlossaryStackDiagram = ({ activeCategoryId }: GlossaryStackDiagramProps) => {
  const prefersReducedMotion = useReducedMotion();

  const counts = React.useMemo(() => {
    const map = new Map<GlossaryCategoryId, number>();
    for (const category of GLOSSARY_CATEGORIES) map.set(category.id, getTermsByCategory(category.id).length);
    return map;
  }, []);

  const rowWeights = STACK_ROWS.map((row) => Math.max(...row.map((id) => counts.get(id) ?? 1)));
  const maxRowWeight = Math.max(...rowWeights);

  const rowHeights = rowWeights.map((weight) => MIN_ROW_HEIGHT + (MAX_ROW_HEIGHT - MIN_ROW_HEIGHT) * (weight / maxRowWeight));
  const totalHeight = rowHeights.reduce((sum, h) => sum + h + GAP, -GAP);

  const handleSelect = (id: GlossaryCategoryId) => (event: React.MouseEvent) => {
    event.preventDefault();
    scrollToAnchor(id, { prefersReducedMotion: prefersReducedMotion ?? false });
  };

  let y = 0;
  const bands: React.ReactNode[] = [];

  STACK_ROWS.forEach((row, rowIndex) => {
    const rowHeight = rowHeights[rowIndex];
    const rowTotal = row.reduce((sum, id) => sum + (counts.get(id) ?? 1), 0);
    let x = 0;

    row.forEach((id) => {
      const share = (counts.get(id) ?? 1) / rowTotal;
      const width = row.length === 1 ? VIEW_WIDTH : share * VIEW_WIDTH - (GAP / row.length) * (row.length - 1);
      const isActive = activeCategoryId === id;
      const isDimmed = activeCategoryId !== null && !isActive;
      const colors = CATEGORY_COLOR_CLASSES[id];

      bands.push(
        <a
          key={id}
          href={`#${id}`}
          onClick={handleSelect(id)}
          aria-label={`Jump to ${labelFor(id)}`}
          className="cursor-pointer focus-visible:outline-none"
        >
          <g className={cn('transition-opacity duration-300', isDimmed ? 'opacity-40' : 'opacity-100')}>
            <rect
              x={x}
              y={y}
              width={Math.max(width, 0)}
              height={rowHeight}
              rx={8}
              className={cn(colors.fill, colors.stroke, 'transition-[stroke-width] duration-200')}
              strokeWidth={isActive ? 2.5 : 1}
            />
            <text
              x={x + 12}
              y={y + rowHeight / 2 - (rowHeight > 56 ? 6 : 0)}
              className={cn('text-[11px] font-semibold', colors.text)}
            >
              {labelFor(id)}
            </text>
            {rowHeight > 56 && (
              <text x={x + 12} y={y + rowHeight / 2 + 14} className={cn('text-[10px] opacity-70', colors.text)}>
                {counts.get(id)} terms
              </text>
            )}
          </g>
        </a>
      );

      x += width + GAP;
    });

    y += rowHeight + GAP;
  });

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${totalHeight}`}
      className="w-full h-auto"
      role="img"
      aria-label="A silicon-to-product cross-section: GPU/CUDA and System Design as independent foundations at the base, rising through Data Engineering, Data Science & AI/ML Engineering, MLOps, and finally Evaluation & Observability at the top. Band size reflects how many terms each category holds."
    >
      {bands}
    </svg>
  );
};

export default GlossaryStackDiagram;
