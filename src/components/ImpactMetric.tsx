"use client";

import React from 'react';
import CountUp from 'react-countup';
import { useReducedMotion } from 'framer-motion';

type ImpactMetricProps = {
  value: number;
  label: string;
  prefix?: string;
  suffix?: string;
  subtext?: React.ReactNode;
};

const ImpactMetric = ({ value, label, prefix = "", suffix = "", subtext }: ImpactMetricProps) => {
  // A3: Respect reduced motion preference
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="flex flex-col items-center justify-start h-full pt-8 pb-6 px-4 text-center border-b md:border-b-0 md:border-r last:border-r-0 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors duration-300 group cursor-default">
      {/* A3: aria-live for screen readers - announces final value once */}
      <div
        className="text-3xl md:text-4xl font-extrabold text-zinc-900 dark:text-white mb-2 font-mono group-hover:scale-110 transition-transform duration-300"
        aria-live="polite"
        aria-atomic="true"
      >
        {prefix}
        {prefersReducedMotion ? (
          // Show static value for reduced motion
          <span>{value.toLocaleString()}</span>
        ) : (
          <CountUp end={value} duration={2.5} separator="," enableScrollSpy scrollSpyOnce />
        )}
        {suffix}
      </div>
      <div className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-4">
        {label}
      </div>
      <div className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed flex items-start justify-center flex-1 w-full">
        {subtext}
      </div>
    </div>
  );
};

export default ImpactMetric;