/**
 * The core decision tree that applies the North Star (see
 * SystemDesignCompassIntro) — three questions, asked in this fixed order,
 * that take a business need to a technological solution regardless of
 * whether the system is data-intensive or customer-facing.
 *
 * Deliberately example-free: worked examples live in communicationScripts.ts
 * and throughout the rest of the page.
 */

export type FramingDecisionQuestionId = 'what' | 'why' | 'how';

export interface FramingDecisionQuestion {
  id: FramingDecisionQuestionId;
  stepNumber: number;
  question: string;
  /** What answering this question resolves. */
  focus: string;
  /** Why it must be answered before the next question. */
  unlocks: string;
}

// Fixed reading order — each answer is the input the next question is judged against.
export const FRAMING_DECISION_TREE: FramingDecisionQuestion[] = [
  {
    id: 'what',
    stepNumber: 1,
    question: 'What are you trying to do?',
    focus:
      'The outcome the business needs and who it serves — scope and a definition of "done", stated before anything technical.',
    unlocks: 'A bounded problem the why can be measured against.',
  },
  {
    id: 'why',
    stepNumber: 2,
    question: 'Why are you doing it?',
    focus:
      'The motivation and the success criteria — which characteristics matter most, and which trade-offs are acceptable to get them.',
    unlocks: 'The constraints that rule approaches in or out.',
  },
  {
    id: 'how',
    stepNumber: 3,
    question: 'How are you going to do it?',
    focus:
      'The technical approach — components, data flow, and trade-offs — chosen only once the what and the why are settled, and judged against them.',
    unlocks: 'A design you can defend, not a preference.',
  },
];
