"use client";

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Widest breakpoint's column count, matching the literal `lg:grid-cols-4`
// class below — Tailwind's static class scanner needs that exact string in
// the className, so it can't be generated from this constant; the two must
// be changed together if the grid's column count ever changes. Since
// md:grid-cols-2 and the base grid-cols-1 both divide evenly into 4, padding
// the rendered item count up to a multiple of 4 keeps every breakpoint's
// last row full with one static DOM-level filler count — there's no way to
// render a different filler count per breakpoint with plain CSS Grid.
const GRID_COLUMNS_LG = 4;

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  /**
   * Pads the rendered child count up to a full row with invisible,
   * aria-hidden filler cells, computed from the actual child count on every
   * render — never tied to any particular page size or fixed item count.
   * Opt-in (default false): only correct when every child is a uniform,
   * non-spanning 1x1 item, so it's off by default for any consumer mixing
   * BentoCard's colSpan/rowSpan.
   */
  fillLastRow?: boolean;
}

export const BentoGrid = ({ children, className, id, fillLastRow = false }: BentoGridProps) => {
  const itemCount = React.Children.count(children);
  const remainder = itemCount % GRID_COLUMNS_LG;
  const fillerCount = fillLastRow && remainder > 0 ? GRID_COLUMNS_LG - remainder : 0;

  return (
    <div id={id} className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[minmax(180px,auto)]", className)}>
      {children}
      {Array.from({ length: fillerCount }).map((_, index) => (
        // visibility:hidden (Tailwind `invisible`), not display:none — the
        // cell must still occupy a grid track to pad the row, just render
        // nothing. aria-hidden removes it from the accessibility tree.
        <div key={`bento-filler-${index}`} aria-hidden="true" className="invisible" />
      ))}
    </div>
  );
};

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2;
  title?: string;
  icon?: LucideIcon;
  href?: string;
  id?: string;
  noFade?: boolean;
}

export const BentoCard = ({ children, className, colSpan = 1, rowSpan = 1, title, icon: Icon, href, id, noFade = true }: BentoCardProps) => {
  const Wrapper = href ? 'a' : 'div';
  const wrapperProps = href ? { href, target: "_blank", rel: "noopener noreferrer" } : {};

  // Respect reduced motion preference (hydration-safe)
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      id={id}
      initial={noFade || prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      whileInView={noFade || prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5, ease: "easeOut" }}
      whileHover={prefersReducedMotion ? undefined : { y: -4, transition: { duration: 0.2 } }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 shadow-sm transition-all hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-800 flex flex-col",
        colSpan === 2 && "md:col-span-2", colSpan === 3 && "md:col-span-3", colSpan === 4 && "md:col-span-4",
        rowSpan === 2 && "md:row-span-2",
        className
      )}
    >
      <Wrapper {...wrapperProps} className="h-full w-full flex flex-col">
        {(title || Icon) && (
          <div className="flex items-center justify-between mb-4 text-zinc-900 dark:text-zinc-100 font-semibold">
             <div className="flex items-center gap-2">
                {Icon && <div className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800"><Icon size={16} className="text-blue-600 dark:text-blue-400" /></div>}
                <span className="tracking-tight">{title}</span>
             </div>
             {href && <ArrowRight size={16} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-zinc-400" />}
          </div>
        )}
        <div className="flex-1 relative z-10">{children}</div>
      </Wrapper>
    </motion.div>
  );
};