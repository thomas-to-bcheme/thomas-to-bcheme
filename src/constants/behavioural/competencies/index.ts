/**
 * Aggregates the 9 Part-II competency chapters (ByteByteGo Ch.05–13) into one
 * ordered array, mapped directly in `page.tsx` via
 * `COMPETENCY_CHAPTERS.map((chapter) => <CompetencyChapterSection key={chapter.id} chapter={chapter} />)` —
 * mirrors how the old page mapped `BEHAVIOURAL_QUESTION_CATEGORIES`. Each
 * chapter file has zero cross-imports from its siblings (relations are by
 * string `CompetencyId`, not direct import), so this is the only file that
 * needs to know about all 9 at once.
 */

import type { CompetencyChapter } from './types';
import { TAKING_INITIATIVE } from './takingInitiative';
import { DELIVERY } from './delivery';
import { PROBLEM_SOLVING_AND_DEEP_DIVE } from './problemSolvingAndDeepDive';
import { EARNING_TRUST_AND_CONFLICT } from './earningTrustAndConflict';
import { LEARNING_AND_GROWTH } from './learningAndGrowth';
import { CUSTOMER_AND_USER_FOCUS } from './customerAndUserFocus';
import { INNOVATION } from './innovation';
import { DEVELOPING_OTHERS } from './developingOthers';
import { STRATEGIC_LEADERSHIP_AND_THINKING_BIG } from './strategicLeadershipAndThinkingBig';

export const COMPETENCY_CHAPTERS: CompetencyChapter[] = [
  TAKING_INITIATIVE,
  DELIVERY,
  PROBLEM_SOLVING_AND_DEEP_DIVE,
  EARNING_TRUST_AND_CONFLICT,
  LEARNING_AND_GROWTH,
  CUSTOMER_AND_USER_FOCUS,
  INNOVATION,
  DEVELOPING_OTHERS,
  STRATEGIC_LEADERSHIP_AND_THINKING_BIG,
];

export type { CompetencyChapter, CompetencyId } from './types';
