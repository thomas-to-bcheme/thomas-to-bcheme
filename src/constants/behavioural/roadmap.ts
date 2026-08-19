/**
 * Powers the /behavioural page's "roadmap" section (`RoadmapSection`) —
 * the three-pillar prep framework (build stories → calibrate their
 * strength → match them to company values), how many stories that
 * actually adds up to by company type and by level, where to go
 * mining inside a single project for more than one story, the
 * research-your-gaps loop for aligning to a specific company's stated
 * values, and a short reading-path router by interview timeline.
 * Synthesized in this site's own coaching voice from ByteByteGo's
 * "The Behavioral Interview Roadmap" chapter — paraphrased, not
 * quoted; see `bytebytego_behavioral_interview_notes.md` §2 for the
 * source notes this was written from.
 */

import type { FrameworkStep } from '@/components/ui/FrameworkStepList';

/**
 * The three pillars ByteByteGo frames prep around — rendered via the shared
 * <FrameworkStepList /> at the top of RoadmapSection. All three have to land
 * together: a well-built story at the wrong level, or a right-level story
 * that misses what the company actually rewards, both fall flat.
 */
export const THREE_PILLARS_STEPS: FrameworkStep[] = [
  {
    id: 'pillar-building-stories',
    marker: '1',
    label: 'Building Your Stories',
    description:
      'Turn raw work experience into structured, tellable stories — most engineers have more of these sitting in their history than they realize; the work is digging them out and shaping them.',
  },
  {
    id: 'pillar-story-strength',
    marker: '2',
    label: 'Ensuring Story Strength',
    description:
      'Calibrate each story to the level you’re actually interviewing for — the same true story can read as junior, senior, or overreaching depending on how you scope and frame it.',
  },
  {
    id: 'pillar-matching-values',
    marker: '3',
    label: 'Matching Company Values',
    description:
      'Align the content and framing of your stories to what your target company specifically rewards — the same story can lead with different strengths depending on who’s listening.',
  },
];

export interface StoryCountByCompanyType {
  id: string;
  companyType: string;
  guidance: string;
}

/**
 * Rough story-count guidance by company archetype, layered on top of the
 * 3–4 "essential questions" every company asks regardless of type. Rendered
 * as a small card grid inside RoadmapSection's "How Many Stories" sub-section.
 */
export const STORY_COUNT_BY_COMPANY_TYPE: StoryCountByCompanyType[] = [
  {
    id: 'startups-high-growth',
    companyType: 'Startups & High-Growth',
    guidance:
      'Lean toward Initiative, Delivery, Innovation, and Learning — with Customer Focus as a useful extra if the role touches the product directly.',
  },
  {
    id: 'large-tech',
    companyType: 'Large Tech',
    guidance:
      'Problem Solving, Cross-Team Leadership, and Trust & Conflict tend to be the core set, with Strategic Leadership, Innovation, and Developing Others expected once you’re interviewing for a senior role.',
  },
  {
    id: 'traditional-enterprise',
    companyType: 'Traditional Enterprise',
    guidance:
      'Delivery, Trust, Customer Focus, and Developing Others carry the most weight, plus Strategic Leadership specifically for roles framed around transformation or modernization work.',
  },
];

export interface StoryCountByLevel {
  id: string;
  level: string;
  guidance: string;
}

/**
 * Rough story-count guidance by target level — how many distinct
 * competencies your story bank needs to cover, not how many stories
 * total (several stories can double up on the same competency).
 * Rendered alongside STORY_COUNT_BY_COMPANY_TYPE.
 */
export const STORY_COUNT_BY_LEVEL: StoryCountByLevel[] = [
  {
    id: 'entry',
    level: 'Entry',
    guidance:
      'Four to six competencies covers it — anchor on Problem Solving, Delivery, and Learning, then round out with one or two stories that speak to culture fit.',
  },
  {
    id: 'mid',
    level: 'Mid',
    guidance:
      'Five to seven competencies — everything at entry level, plus Initiative and Trust & Conflict, and at least one of Customer Focus or Innovation.',
  },
  {
    id: 'senior-plus',
    level: 'Senior+',
    guidance:
      'Seven to ten competencies — Strategic Leadership and Developing Others become non-negotiable, plus Innovation and whatever else your target company specifically values.',
  },
];

/**
 * The moment-types worth mining out of a single meaty project — the
 * reframe being that one multi-month effort usually contains several
 * distinct behavioural stories, not just one. Rendered as a bullet list
 * under RoadmapSection's "Mining Your Experiences" sub-section.
 */
export const STORY_MINING_MOMENTS: string[] = [
  'A decision point where the direction of the work could have gone two ways, and you were the one who chose',
  'A problem that had already stumped other people before you took it on',
  'A moment where you got a group of people with different opinions to actually align',
  'A delivery that happened despite a real obstacle in the way, not a clean straight line to done',
  'A lesson that actually changed how you approach the work afterward, not just a one-off fix',
  'A moment you stepped outside your defined role because the situation needed it, not because you were asked',
];

/**
 * The company-values loop — research what a company actually rewards
 * (beyond the careers page), find where your current story bank comes up
 * short against it, then fill the gap. Rendered via the shared
 * <FrameworkStepList /> in RoadmapSection's "Matching Company Values"
 * sub-section.
 */
export const MATCHING_COMPANY_VALUES_STEPS: FrameworkStep[] = [
  {
    id: 'values-research',
    marker: '1',
    label: 'Research Their Values',
    description:
      'Go past the careers page — employee blog posts, conference talks, and published interview guides tend to reveal what a stated value actually looks like in day-to-day practice.',
  },
  {
    id: 'values-gaps',
    marker: '2',
    label: 'Identify Your Gaps',
    description:
      'Lay your existing stories next to what you just learned the company rewards. A company that talks about thinking big while your whole story bank is incremental improvements is a gap worth noticing before the interview, not during it.',
  },
  {
    id: 'values-fill',
    marker: '3',
    label: 'Fill What’s Missing',
    description:
      'Close the gap two ways: dig for an overlooked experience (a side project, an incident you handled) that fits, or re-tell an existing story through a different lens — the same project can foreground technical depth, customer impact, cross-team coordination, or speed depending on which one the company actually cares about.',
  },
];

export interface ReadingPathRecommendation {
  id: string;
  scenario: string;
  path: string;
}

/**
 * Practical routing through this page depending on how much runway you
 * have before your next interview. Rendered as a small grid at the end of
 * RoadmapSection.
 */
export const READING_PATH_RECOMMENDATIONS: ReadingPathRecommendation[] = [
  {
    id: 'interview-next-week',
    scenario: 'Interviewing next week',
    path:
      'Go straight to story structure and the essential questions, skim the competency section that matches your target level, then spend whatever time is left on delivery.',
  },
  {
    id: 'actively-interviewing',
    scenario: 'Actively interviewing multiple companies',
    path:
      'Read the full framework once end to end, then treat each competency as a lookup reference you revisit per company as interviews come up.',
  },
  {
    id: 'planning-ahead',
    scenario: 'Planning ahead',
    path: 'No shortcuts needed — read straight through in order and build your story bank as you go.',
  },
  {
    id: 'assessing-readiness',
    scenario: 'Not sure you’re ready yet',
    path:
      'Start with the fit-vs-level material to benchmark honestly where you actually stand before you invest time building stories for the wrong target.',
  },
];
