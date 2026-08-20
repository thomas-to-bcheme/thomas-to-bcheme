/**
 * Type contracts for the 9 Part-II competency chapters (ByteByteGo Ch.05–13:
 * Taking Initiative through Strategic Leadership and Thinking Big). This is
 * the gating file every `competencies/*.ts` data file and every competency
 * rendering component depends on — get this shape right before authoring
 * the 9 chapters against it.
 *
 * `LevelSignal` is reused unchanged from `../careerLevels` — it now spans
 * the full Junior→Principal ladder (one sentence per rung) rather than a
 * two-point Senior/Staff contrast, regardless of which storytelling
 * framework (STAR or HSS) wraps the sample question. `HssStoryGuidance`
 * replaces the old `StarGuidance` shape now that High-Signal Storytelling,
 * not STAR, is the page's hero framework.
 */

import type { CareerLevelId, LevelSignal } from '../careerLevels';

export type CompetencyId =
  | 'taking-initiative'
  | 'delivery'
  | 'problem-solving-and-deep-dive'
  | 'earning-trust-and-conflict'
  | 'learning-and-growth'
  | 'customer-and-user-focus'
  | 'innovation'
  | 'developing-others'
  | 'strategic-leadership-and-thinking-big';

export interface CompetencyQuestionCategory {
  id: string;
  label: string;
  exampleQuestion: string;
}

/**
 * HSS-shaped guidance for one sample story: what minimal context to
 * establish, what a strong headline needs to assert, and the 2–3 moments
 * (thought process → action → result, folded together per HSS's Behavioral
 * Core) worth building out — not a Situation/Task/Action/Result breakdown.
 */
export interface HssStoryGuidance {
  contextHint: string;
  headlineHint: string;
  behavioralCoreMoments: string[];
}

export interface CompetencySampleQuestion {
  /** Carries over the OLD BehaviouralQuestionCategory id where this sample
   *  question was re-mapped from the page's previous 11-category structure,
   *  purely for traceability — not rendered. */
  id: string;
  category: string;
  prompt: string;
  framingNotes: string;
  hssGuidance: HssStoryGuidance;
  levelSignal: LevelSignal;
  /** One concrete 2–4 sentence HSS-shaped narrated example (a headline, one
   *  core beat, a result) anchored at whichever rung of the ladder is most
   *  illustrative for this specific prompt — a single worked example per
   *  sample question, not one per level. */
  workedExample: { level: CareerLevelId; story: string };
}

export interface CompetencyKeyTakeaways {
  strongStoriesInclude: string[];
  avoidTheseTraps: string[];
}

export interface CompetencyChapter {
  id: CompetencyId;
  /** ByteByteGo's own chapter number, 5–13 — shown as a small "Ch. 05" tag. */
  chapterNumber: number;
  title: string;
  /** ByteByteGo deep link for this chapter — powers the inline "Read the
   *  chapter" citation link rather than hardcoding the URL per component. */
  sourceUrl: string;
  /** 1–2 sentence scene-setter in original phrasing — not the book's own
   *  opening anecdote. */
  openingHook: string;
  definition: string;
  /** Most chapters draw one sharp distinction against an adjacent, easily
   *  confused idea (e.g. Initiative vs. Ownership) — optional since not every
   *  chapter needs one. */
  keyDistinction?: { label: string; explanation: string };
  centralTension: string;
  culturalConsiderations: string;
  /** Small Badge-chip row of real company mottos ByteByteGo cites for this
   *  competency (e.g. Amazon "Bias for Action") — public corporate values,
   *  not ByteByteGo's own prose, so safe to quote directly. Optional. */
  namedCompanyValues?: { company: string; value: string }[];
  relatedCompetencies: { id: CompetencyId; relationship: string }[];
  questionCategories: CompetencyQuestionCategory[];
  sampleQuestions: CompetencySampleQuestion[];
  keySignals: string[];
  /** Notes present red and yellow flags as one merged list per chapter —
   *  match that here rather than inventing a severity split. */
  redFlags: string[];
  /** "If Examples Don't Come Easily" — reflection prompts for excavating a
   *  story when nothing comes to mind. */
  reflectionQuestions: string[];
  keyTakeaways: CompetencyKeyTakeaways;
}
