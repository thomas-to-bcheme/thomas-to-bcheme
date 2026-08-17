/**
 * Behavioural interview reference data.
 *
 * Two datasets power the /behavioural page:
 *  - STAR_FRAMEWORK: the generic 4-step Situation/Task/Action/Result method,
 *    rendered once via the shared <FrameworkStepList /> component.
 *  - BEHAVIOURAL_QUESTION_CATEGORIES: recurring behavioural-question
 *    archetypes, each with framing notes (how to approach the category
 *    *before* reaching for STAR) and STAR-specific guidance for that
 *    archetype, rendered as accordion cards.
 */

import type { FrameworkStep } from '@/components/ui/FrameworkStepList';

export const STAR_FRAMEWORK: FrameworkStep[] = [
  {
    id: 'star-situation',
    marker: 'S',
    label: 'Situation',
    description:
      'Set the scene in a few sentences — the context, team, and constraints the interviewer needs before your actions make sense. Keep it tight; this is scaffolding, not the story.',
    detail: [
      'What was the context, team, and timeframe?',
      'Who else was involved, and what was their stake in the outcome?',
      'What constraint or pressure made this situation worth telling?',
    ],
  },
  {
    id: 'star-task',
    marker: 'T',
    label: 'Task',
    description:
      'Name the specific responsibility or goal that was yours — not the team’s, not the company’s. This is where you clarify what "done" would have looked like.',
    detail: [
      'What was explicitly your responsibility versus the team’s?',
      'What was the goal, deadline, or definition of success?',
      'What made this task non-trivial — why couldn’t you just wing it?',
    ],
  },
  {
    id: 'star-action',
    marker: 'A',
    label: 'Action',
    description:
      'Walk through the specific, deliberate steps you took. This is the part interviewers weight most heavily, since it reveals judgment, not just outcome.',
    detail: [
      'What did you personally do, step by step, in first person?',
      'What alternatives did you consider and reject, and why?',
      'How did you bring others along or handle pushback along the way?',
    ],
  },
  {
    id: 'star-result',
    marker: 'R',
    label: 'Result',
    description:
      'Close with the measurable outcome and, ideally, what changed in how you work afterward. A result without a lesson reads as luck, not skill.',
    detail: [
      'What was the quantifiable or observable outcome?',
      'How did you know it worked — what signal confirmed it?',
      'What would you do differently, or what did this permanently change?',
    ],
  },
];

export interface StarGuidance {
  situation: string;
  task: string;
  action: string;
  result: string;
}

/**
 * To add a 7th+ category: append its id to this union, then append a
 * matching entry to BEHAVIOURAL_QUESTION_CATEGORIES below. No other file
 * needs to change — BehaviouralCategoryCard and the page render generically
 * off this array, and PageSectionNav items are keyed by id in page.tsx.
 */
export type BehaviouralCategoryId =
  | 'resistance-to-change'
  | 'scope-creep'
  | 'conflict-resolution'
  | 'navigating-ambiguity'
  | 'mentoring-juniors'
  | 'leadership-style';

export interface BehaviouralQuestionCategory {
  id: BehaviouralCategoryId;
  category: string;
  prompt: string;
  framingNotes: string;
  starGuidance: StarGuidance;
}

export const BEHAVIOURAL_QUESTION_CATEGORIES: BehaviouralQuestionCategory[] = [
  {
    id: 'resistance-to-change',
    category: 'Addressing "We’ve Always Done It This Way"',
    prompt:
      'Tell me about a time you proposed a change to how something had always been done, and faced resistance.',
    framingNotes:
      'Interviewers use this to test whether you can drive change without steamrolling people. The trap is framing the story as "I was right, they were slow" — that reads as arrogance, not leadership. What they’re actually listening for: did you diagnose why the resistance existed (fear of losing ownership, a past failed attempt, a genuine unstated risk) before pushing, and did you bring skeptics along rather than simply overriding them.',
    starGuidance: {
      situation:
        'Anchor the resistance in something concrete — a legacy process, a specific team, a specific decision-maker who owned the old way — not a vague "the team resisted change."',
      task: 'Be explicit about whether you had authority to make the change or had to earn buy-in — this distinguishes a leadership story from an authority story.',
      action:
        'Detail how you addressed the reason for resistance specifically (data, a pilot, a low-risk trial) rather than just repeating your proposal louder.',
      result:
        'Quantify the outcome, and note whether the resistant party became a convert — an interviewer listens for whether you changed a mind or just won a vote.',
    },
  },
  {
    id: 'scope-creep',
    category: 'Going Out of Scope / Scope Creep',
    prompt:
      'Describe a project where the scope expanded significantly beyond what was originally planned. How did you handle it?',
    framingNotes:
      'This probes two very different skills depending on which side of scope creep you tell: did you push back on scope creep to protect a deadline, or did you recognize that expanding scope was the right call and renegotiate the plan? Pick the version that’s true and be explicit about which one it is — interviewers penalize stories that can’t say whether scope grew for a good reason or a bad one.',
    starGuidance: {
      situation:
        'State the original scope and deadline precisely, so the expansion has a baseline to be measured against.',
      task: 'Clarify your role in scope ownership — were you the one who had to say no, or the one absorbing a stakeholder’s new ask?',
      action:
        'Show the tradeoff conversation you had — what you cut, deferred, or renegotiated, and with whom — rather than just absorbing the extra work silently.',
      result:
        'Report what actually shipped, on what timeline, and whether the relationship with the requesting stakeholder stayed intact — silent overtime is not a good outcome even if the deadline was hit.',
    },
  },
  {
    id: 'conflict-resolution',
    category: 'Conflict Resolution',
    prompt: 'Tell me about a time you disagreed with a coworker or manager. How did you handle it?',
    framingNotes:
      'The single biggest failure mode here is a one-sided story where the other person is simply "wrong" and you were "right." Interviewers listen for whether you can accurately represent the other side’s position — that’s the real signal of maturity, not who ultimately won the disagreement.',
    starGuidance: {
      situation:
        'Describe the disagreement in terms both sides would recognize as fair — avoid caricaturing the other person’s position.',
      task: 'Separate any disagreement over the what from any disagreement over the how — this shows you can decompose conflict rather than treat it as monolithic.',
      action:
        'Emphasize how you tried to understand their reasoning before advocating for yours (questions asked, data sought), and how you escalated or resolved it if you couldn’t agree.',
      result:
        'Note the resolution and, critically, the state of the working relationship afterward — a resolved decision with a damaged relationship is a partial win at best.',
    },
  },
  {
    id: 'navigating-ambiguity',
    category: 'Navigating Ambiguity Without Guidance',
    prompt: 'Tell me about a time you were given a task or problem with little direction. How did you proceed?',
    framingNotes:
      'This tests tolerance for uncertainty and bias toward action — not whether you eventually got clear instructions. The failure mode is a story that’s secretly about someone else clarifying the ambiguity for you. The interviewer wants to see how you structured an unstructured problem before anyone told you what "right" looked like.',
    starGuidance: {
      situation:
        'Establish exactly what was missing — an unclear goal, unclear owner, or unclear constraints. Ambiguity is not one thing, and naming the specific kind shows self-awareness.',
      task: 'Frame the task as one you partly had to define yourself — what did you decide the goal should be, and how did you validate that guess?',
      action:
        'Show the concrete steps you took to reduce uncertainty (small experiments, talking to stakeholders, a working prototype) before committing to a full solution.',
      result:
        'Report the outcome and whether your interpretation of the ambiguous ask turned out to be right — and if not, how quickly you corrected course.',
    },
  },
  {
    id: 'mentoring-juniors',
    category: 'Mentoring Junior Engineers',
    prompt: 'Tell me about a time you helped a junior engineer grow. What did you do, and what was the impact?',
    framingNotes:
      'Weak answers describe tasks the mentor did for the mentee. Strong answers describe a deliberate teaching strategy — the mentor stepping back so the mentee could build the skill themselves. Interviewers listen for whether you can identify what specifically was missing in the mentee’s skill set, not just that you were "helpful."',
    starGuidance: {
      situation:
        'Identify the specific skill or confidence gap the junior engineer had — vague, and it reads as a story about being nice rather than about developing someone.',
      task: 'State what you set out to build in them (a specific capability, not just "help them succeed") and over what time horizon.',
      action:
        'Describe your teaching method concretely — pairing, code-review calibration, deliberately assigning stretch work — and how you adjusted when your first approach didn’t land.',
      result:
        'Point to evidence of independent growth after your involvement decreased — that’s the real signal of mentorship versus doing the work alongside them indefinitely.',
    },
  },
  {
    id: 'leadership-style',
    category: 'Leadership Style',
    prompt: 'How would you describe your leadership style, or tell me about a time you led without formal authority.',
    framingNotes:
      'This is often asked of ICs specifically to see if they can lead through influence. A generic answer ("I lead by example") is forgettable. The interviewer wants a philosophy that’s falsifiable — one that implies what you wouldn’t do — backed by a concrete instance where that philosophy was tested.',
    starGuidance: {
      situation:
        'Pick a moment where leadership was actually required — a decision needed to be made and no one had unilateral authority to make it.',
      task: 'Be explicit that you had no formal authority in this situation — that’s the entire point of the story, so don’t let it be implied.',
      action:
        'Show the specific influence tactics you used (building consensus, demonstrating with a prototype, borrowing authority from data) rather than an appeal to seniority.',
      result:
        'Tie the outcome back to your stated leadership philosophy — the result should be evidence for the philosophy, not just a good outcome.',
    },
  },
];
