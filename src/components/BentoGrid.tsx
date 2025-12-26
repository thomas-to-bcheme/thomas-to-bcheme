"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, LucideIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const BentoGrid = ({ children, className, id }: { children: React.ReactNode, className?: string, id?: string }) => (
  <div id={id} className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[minmax(180px,auto)]", className)}>
    {children}
  </div>
);

type BentoCardProps = {
  children: React.ReactNode;
  className?: string;
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2;
  title?: string;
  icon?: LucideIcon;
  href?: string;
  id?: string;
  noFade?: boolean;
};

export const BentoCard = ({ children, className, colSpan = 1, rowSpan = 1, title, icon: Icon, href, id, noFade = true }: BentoCardProps) => {
  const Wrapper = href ? 'a' : 'div';
  // @ts-ignore - dynamic component wrapper typing
  const wrapperProps = href ? { href, target: "_blank" } : {};

  return (
    <motion.div 
      id={id}
      initial={noFade ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      whileInView={noFade ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
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