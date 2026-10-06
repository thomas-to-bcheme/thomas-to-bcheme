import type { LifecycleTone } from '@/constants/systemDesignPrep/foundations';

// Literal class strings per tone — Tailwind can't see interpolated names.
export const TONE_CLASSES: Record<LifecycleTone, string> = {
  rose: 'bg-rose-100 border-rose-300 text-rose-900 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-100',
  emerald: 'bg-emerald-100 border-emerald-300 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-100',
  violet: 'bg-violet-100 border-violet-300 text-violet-900 dark:bg-violet-950/60 dark:border-violet-800 dark:text-violet-100',
  sky: 'bg-sky-100 border-sky-300 text-sky-900 dark:bg-sky-950/60 dark:border-sky-800 dark:text-sky-100',
  zinc: 'bg-zinc-100 border-zinc-300 text-zinc-800 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-200',
  amber: 'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-100',
  purple: 'bg-purple-100 border-purple-300 text-purple-900 dark:bg-purple-950/60 dark:border-purple-800 dark:text-purple-100',
  blue: 'bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-100',
  yellow: 'bg-yellow-100 border-yellow-300 text-yellow-900 dark:bg-yellow-950/60 dark:border-yellow-800 dark:text-yellow-100',
  teal: 'bg-teal-100 border-teal-300 text-teal-900 dark:bg-teal-950/60 dark:border-teal-800 dark:text-teal-100',
  pink: 'bg-pink-100 border-pink-300 text-pink-900 dark:bg-pink-950/60 dark:border-pink-800 dark:text-pink-100',
  orange: 'bg-orange-100 border-orange-300 text-orange-900 dark:bg-orange-950/60 dark:border-orange-800 dark:text-orange-100',
};
