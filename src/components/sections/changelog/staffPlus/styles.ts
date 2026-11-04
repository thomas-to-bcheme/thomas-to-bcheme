import type { QuestionKind } from '@/constants/staffPlus/types';

export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black';

export const LINK_CLASS = `text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline rounded-sm ${FOCUS_RING}`;

/** One badge style per conversation move, so the reader can scan for the move they need. */
export const QUESTION_KIND_BADGE: Record<QuestionKind, string> = {
  reflective: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
  probing: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800',
  deeper: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800',
};

export const QUESTION_KIND_LABEL: Record<QuestionKind, string> = {
  reflective: 'Reflective',
  active: 'Active',
  probing: 'Probing',
  deeper: 'Deeper',
};
