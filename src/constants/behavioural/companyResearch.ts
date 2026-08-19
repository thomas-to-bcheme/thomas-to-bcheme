/**
 * Moved unchanged from the old flat `constants/behavioural.ts`.
 */

export interface ResearchTactic {
  id: string;
  source: string;
  approach: string;
  questionsToAsk: string[];
}

/**
 * Concrete pre-interview tactics for sensing which side of each FIT_TENSION_AXES axis a
 * company actually sits on, before you're in the room. Rendered by
 * ResearchChecklistSection. Synthesized from ByteByteGo's "What Companies Are Looking For".
 */
export const COMPANY_RESEARCH_TACTICS: ResearchTactic[] = [
  {
    id: 'recruiter',
    source: 'Your Recruiter',
    approach:
      'Recruiters succeed when you get an offer — treat them as a source of insider information, not a gatekeeper to get past.',
    questionsToAsk: [
      "What's the team actually struggling with right now, beyond what's in the job description?",
      'Which of my skills matters most for this particular seat, in their eyes?',
      "Is there any prep material or scoring guide you're able to pass along?",
    ],
  },
  {
    id: 'public-information',
    source: 'Public Information',
    approach:
      'Repeated words in a job post, an engineering blog, or a conference talk are signal, not filler — notice what a company chooses to celebrate or publish.',
    questionsToAsk: [
      'What do their engineering blog posts and conference talks choose to highlight — speed, scale, or reliability?',
      'What have they open-sourced, and what does that choice say about what they value?',
      'Do they publish detailed postmortems — a sign they reward learning from failure over hiding it?',
    ],
  },
  {
    id: 'forums',
    source: 'Glassdoor / Blind / Reddit',
    approach:
      'Ignore any single rant; look for the same complaint or praise repeating across several unrelated posts.',
    questionsToAsk: [
      'Does "too much process" or "no work-life balance" show up more than once?',
      'Does "autonomy" or "learning culture" show up as praise more than once?',
    ],
  },
  {
    id: 'employees',
    source: 'Current Employees',
    approach:
      "Skip \"how's the culture\" — ask a question specific enough that the answer reveals a real behavior, not a slogan.",
    questionsToAsk: [
      'What did the last person who got promoted here actually do differently?',
      'What is something that would get you dinged in a review here?',
      'When two people on the team genuinely disagree, how does it actually get settled?',
    ],
  },
];
