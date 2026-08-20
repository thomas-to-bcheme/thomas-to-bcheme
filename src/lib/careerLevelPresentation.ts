import type { CareerLevelId } from '@/constants/behavioural/careerLevels';

/**
 * Shared presentation-only styling for the Junior→Principal career ladder —
 * color isn't content, so it's kept out of the constants files and lives
 * here instead. Reused by both `SeniorVsStaffSection` (the general
 * level-signaling framework) and every competency chapter's
 * `CompetencySampleQuestionCard` (the per-question level-signal render), so
 * a given rung always reads with the same badge color and border accent
 * wherever it appears on the page.
 */

/**
 * Badge color per rung of the ladder. Reads cool-to-warm as scope grows,
 * reusing the Badge component's existing palette (no new tokens): zinc →
 * green → blue → purple → amber → rose.
 */
export const LEVEL_BADGE_COLORS: Record<CareerLevelId, 'zinc' | 'green' | 'blue' | 'purple' | 'amber' | 'rose'> = {
  junior: 'zinc',
  mid: 'green',
  senior: 'blue',
  staff: 'purple',
  seniorStaff: 'amber',
  principal: 'rose',
};

export const LEVEL_BORDER_CLASSES: Record<CareerLevelId, string> = {
  junior: 'border-l-zinc-300 dark:border-l-zinc-600',
  mid: 'border-l-emerald-400 dark:border-l-emerald-500',
  senior: 'border-l-blue-400 dark:border-l-blue-500',
  staff: 'border-l-purple-400 dark:border-l-purple-500',
  seniorStaff: 'border-l-amber-400 dark:border-l-amber-500',
  principal: 'border-l-rose-400 dark:border-l-rose-500',
};
