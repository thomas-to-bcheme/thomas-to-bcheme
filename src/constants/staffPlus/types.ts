/**
 * Types for the /projects Senior-to-Staff+ section. Kept in their own file so
 * client components can import them without pulling in the registry barrel.
 */

/** reflective/active = listening moves; probing/deeper = questioning moves. */
export type QuestionKind = 'reflective' | 'active' | 'probing' | 'deeper';

export interface CoreQuestion {
  kind: QuestionKind;
  /** The sentence the reader would actually say, phrased for this topic. */
  question: string;
  /** One sentence on what the question surfaces that a plain answer would not. */
  whyItWorks: string;
}

export interface IndustryStandard {
  name: string;
  /** One sentence: what it is and what decision it improves. */
  description: string;
}

/** The staff-level lens the user asked for: risk, organizational spend, financial alignment. */
export interface BusinessLens {
  risk: string;
  spend: string;
  financialAlignment: string;
}

export interface StaffPlusTopic {
  id: string;
  title: string;
  summary: string;
  /** How the same situation reads at senior vs staff+ scope. */
  seniorToStaffShift: { senior: string; staff: string };
  insight: string;
  bestPractices: string[];
  industryStandards: IndustryStandard[];
  businessLens: BusinessLens;
  coreQuestions: CoreQuestion[];
  /** Ids of COMPETENCY_STORIES (src/data/credentials.ts) that evidence this topic. */
  relatedStoryIds: string[];
}

export interface ListeningSkill {
  kind: QuestionKind;
  label: string;
  definition: string;
  useWhen: string;
  examplePhrases: string[];
  pitfall: string;
}

export interface PlaybookFramework {
  id: string;
  name: string;
  template: string;
  useWhen: string;
}

export interface StakeholderIntakeQuestion {
  id: string;
  question: string;
  /** What the answer must pin down. */
  identify: string;
  /** What the answer decides downstream. */
  determines: string;
  followUps: { kind: QuestionKind; question: string }[];
}
