/**
 * Practical Technical page data
 *
 * The page's framing (per site owner): technical interview prep rests on
 * two fundamentals pillars — programming fundamentals AND agentic CLI tool
 * fundamentals (this portfolio itself is a Claude Code project, so agentic
 * workflow literacy is a first-class technical skill here, not a footnote).
 * Both pillars get exercised across two interview delivery modes
 * (synchronous / asynchronous), most commonly on LeetCode, HackerRank, and
 * CoderPad.
 */

export type InterviewMode = 'synchronous' | 'asynchronous';

export interface FundamentalsPillar {
  id: 'programming-fundamentals' | 'agentic-cli-fundamentals';
  label: string;
  description: string;
  topics: string[];
  supportsMode: InterviewMode[];
}

export const FUNDAMENTALS_PILLARS: FundamentalsPillar[] = [
  {
    id: 'programming-fundamentals',
    label: 'Programming Fundamentals',
    description:
      'Data structures, algorithms, and complexity analysis — the baseline vocabulary every technical interview format assumes, whether it is live or take-home.',
    topics: [
      'Arrays, hashmaps, and string manipulation',
      'Trees, graphs, and traversal strategies',
      'Recursion and iterative decomposition',
      'Sorting and searching strategies',
      'Time/space complexity (Big O) analysis',
      'Edge-case handling and input validation',
    ],
    supportsMode: ['synchronous', 'asynchronous'],
  },
  {
    id: 'agentic-cli-fundamentals',
    label: 'Agentic CLI Tool Fundamentals',
    description:
      'Fluency with agentic CLI coding tools (Claude Code and similar) — an increasingly real signal in technical interviews as agentic tools become standard practice, not a novelty. Most naturally demonstrated in take-home settings, though some sync formats now explicitly allow it too.',
    topics: [
      'Scoping and prompting a task for an agent',
      'Verifying agent output rather than trusting it blindly',
      'Using tools like Read/Edit/Bash effectively',
      'Knowing when to delegate vs. drive directly',
      'Working within an existing codebase\'s conventions',
    ],
    supportsMode: ['asynchronous'],
  },
];

export interface InterviewModeProfile {
  mode: InterviewMode;
  label: string;
  description: string;
  whatItRewards: string[];
}

export const INTERVIEW_MODES: InterviewModeProfile[] = [
  {
    mode: 'synchronous',
    label: 'Synchronous — Live Pairing / Whiteboard',
    description:
      'Real-time collaboration with an interviewer in the room (or on the call) actively steering scope, asking follow-ups, and giving hints as you think out loud.',
    whatItRewards: [
      'Communication under pressure',
      'Incremental problem-solving visible in real time',
      'Handling live feedback and redirection',
    ],
  },
  {
    mode: 'asynchronous',
    label: 'Asynchronous — Take-Home / Untimed',
    description:
      'Self-directed scoping with no interviewer present, often allowing real tools — search, documentation, and sometimes AI assistants.',
    whatItRewards: [
      'Code quality and polish',
      'Self-directed scope management',
      'Testing discipline',
      'Written communication (a README or PR description standing in for live narration)',
    ],
  },
];

export type PracticePlatformId = 'leetcode' | 'hackerrank' | 'coderpad';

export interface PracticePlatform {
  id: PracticePlatformId;
  label: string;
  primaryMode: InterviewMode;
  fundamentalsTested: string[];
  notes: string;
  mostCommon?: boolean;
}

export const PRACTICE_PLATFORMS: PracticePlatform[] = [
  {
    id: 'leetcode',
    label: 'LeetCode',
    primaryMode: 'asynchronous',
    fundamentalsTested: [
      'Algorithmic problem-solving',
      'Complexity analysis',
      'Pattern recognition across problem categories',
    ],
    notes:
      'Primarily a self-practice tool used asynchronously, but the same problem set also shows up live — some interviewers screen-share a LeetCode-style problem and pair through it in real time.',
  },
  {
    id: 'hackerrank',
    label: 'HackerRank',
    primaryMode: 'asynchronous',
    fundamentalsTested: [
      'Correctness across hidden test cases',
      'Broader language/fundamentals coverage — not just algorithms',
      'SQL, shell, and OOP question tracks',
    ],
    notes:
      'Often the initial screen or take-home stage before a live round — untimed or loosely timed, with hidden test suites doing the grading instead of an interviewer.',
  },
  {
    id: 'coderpad',
    label: 'CoderPad',
    primaryMode: 'synchronous',
    mostCommon: true,
    fundamentalsTested: [
      'Real-time problem-solving with an interviewer watching',
      'Ability to run and debug code live',
      'Communication while coding',
    ],
    notes:
      'The most common live-interview tool in practice — supports multiple languages and sometimes a shared collaborative view, so the pairing feel matters as much as the code.',
  },
];
