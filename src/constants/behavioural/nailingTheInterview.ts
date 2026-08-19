/**
 * Ch.14 "Nailing the Interview" — ByteByteGo's closing chapter, covering the
 * delivery mechanics that sit on top of everything the framework (HSS) and
 * competency chapters already prepared: how to show up (mind/body, presence,
 * first impressions, mindset), what to actually memorize versus let flow
 * live, how to practice, how to run a real-time conversation once you're in
 * the room (interruptions, follow-ups, reading engagement, multi-round
 * energy), and how to turn each interview into practice for the next one.
 * Paraphrased in this site's own voice from ByteByteGo's "Nailing the
 * Interview" page — three arrays, one per chapter phase (Before / During /
 * After), each rendered as a static card grid by its matching section
 * component.
 */

export interface InterviewPhaseTopic {
  id: string;
  heading: string;
  body: string;
  items?: string[];
}

/**
 * Before the interview — preparation that happens before you're ever in the
 * room: body and mindset, what to memorize versus improvise, how to
 * practice, and the final logistics checklist. Rendered by
 * BeforeInterviewSection.
 */
export const BEFORE_INTERVIEW_TOPICS: InterviewPhaseTopic[] = [
  {
    id: 'mind-and-body',
    heading: 'Prepare your mind and body',
    body: 'Treat the day before and the day of as logistics to lock down, not moments to improvise — the goal is a morning with zero decisions left to make.',
    items: [
      'Night before: aim for 7–8 hours of sleep, screens off an hour before bed, clothes/route/tech laid out in advance',
      "Day of: stick to your normal routine — usual breakfast, usual caffeine, steady hydration",
      'A short walk or stretch before you sit down to burn off nervous energy',
    ],
  },
  {
    id: 'being-present',
    heading: 'Being present',
    body: 'Nerves cause shallow chest breathing, which starves your brain of oxygen and makes the anxiety worse — counter it deliberately rather than white-knuckling through it.',
    items: [
      'Five deep belly breaths before you start, and one at every transition between questions',
      'Let a question fully land before you answer — a 2–3 second pause reads as thoughtful, not slow, and keeps you from answering the wrong question',
      "Look up your interviewers by name beforehand so any curiosity about them in the room is genuine",
    ],
  },
  {
    id: 'first-impression',
    heading: 'Make a strong first impression',
    body: 'Three things compound in the first thirty seconds: looking sharp, sounding enthusiastic, and coming across as someone who actually knows their work.',
    items: [
      'Sharp — appropriate attire, eye-level camera and tested audio (or on-time arrival), posture and eye contact from the first hello',
      'Enthusiastic — varied vocal tone, open body language, a genuine smile, leaning in rather than sitting flat',
      'Expert — confidence built on specifics, not bravado: say "we cut latency 40%," not "I think we maybe improved things by around 40% or so" — hedging quietly erases a real result',
    ],
  },
  {
    id: 'right-mindset',
    heading: 'Hold the right mindset',
    body: 'Frame the hour as a professional conversation you are also steering, not a performance you have to nail perfectly.',
    items: [
      'A stumble in a conversation is a non-event; the same stumble in a "performance" feels catastrophic',
      "You're also evaluating them — holding that frame lowers desperation and produces sharper questions",
      'Go in curious about one specific thing you actually want to learn, and redirect anxious spikes back toward that curiosity',
    ],
  },
  {
    id: 'preparation-hierarchy',
    heading: 'Know the preparation hierarchy',
    body: 'Only a few things are worth memorizing tightly — everything in between should flow live from the conversation itself.',
    items: [
      'The headline — the opening line should be solid enough that you can vary its exact wording while the content underneath stays fixed',
      'Your key points — the 2–3 behavioral waypoints of the story stay fixed even if the path between them flexes in the moment',
      'The landing — your numbers or impact, ready to say more than one way',
      "This is your existing story pyramid, just relabeled for how you deliver it out loud: memorize the waypoints, not a script",
    ],
  },
  {
    id: 'natural-language',
    heading: 'Find your natural language',
    body: "Strip out the corporate phrasing that creeps in from job postings and decks, and say what actually happened in plain words.",
    items: [
      'Test: could you explain this to a friend who has never worked in tech?',
      '"I got three teams to agree on a new process that saved everyone five hours a week" beats any sentence with "leveraged cross-functional stakeholder alignment" in it',
    ],
  },
  {
    id: 'practice-conversing',
    heading: 'Practice conversing, not reciting',
    body: 'Rehearsing a story word-for-word trains you to perform it; these three drills train you to actually converse through it instead.',
    items: [
      'Story Interruption — a partner cuts in mid-story with random questions; you answer fully, then bridge back',
      'Key Point Shuffle — tell the same story starting from a different key point each time, so no single fixed order owns you',
      'Conversational Paraphrasing — retell the same story three different ways so you\'re not dependent on one memorized phrasing',
    ],
  },
  {
    id: 'truthfulness',
    heading: 'Truthfulness is non-negotiable',
    body: "Deep-dive follow-up questions exist specifically to expose fabrication — you cannot pre-write infinite invented detail, and experienced interviewers are tuned to spot vagueness under pressure and small internal contradictions.",
  },
  {
    id: 'progressive-practice',
    heading: 'Build up through progressive practice',
    body: 'Advance through four milestones at your own pace rather than a fixed schedule, each one raising the realism of the practice.',
    items: [
      'Solo recording — hear your own voice, self-audit pacing and verbal tics',
      'Non-technical friends — their naive questions force you to drop jargon',
      'Mock interviews with professionals — realistic probing, practice defending decisions',
      'Lower-stakes real interviews — companies you care less about first, so the stakes feel real before they count most',
    ],
  },
  {
    id: 'final-logistics',
    heading: 'Lock down the final logistics',
    body: 'A short setup checklist removes avoidable friction right before the interview starts.',
    items: [
      'Video: camera at eye level, look at the camera (not your own screen) while speaking, neutral background, a real headset mic, face a light source, close notification-prone apps',
      'In-person: arrive 15 minutes early and check in 5 minutes before, bring resume copies and a short bullet list, keep waiting-room time phone-free',
    ],
  },
];

/**
 * During the interview — the live-execution skills for the room itself:
 * handling interruptions and follow-ups, reading the interviewer's lead,
 * checking in, recovering from an unexpected question, and pacing yourself
 * across a multi-round loop. Rendered by DuringInterviewSection.
 */
export const DURING_INTERVIEW_TOPICS: InterviewPhaseTopic[] = [
  {
    id: 'real-conversations',
    heading: 'Treat interruptions as engagement, not disapproval',
    body: 'Only an engaged interviewer interrupts — the interruption is the conversation happening, not a detour you need to recover from.',
    items: [
      'Pause and make eye contact',
      'Answer their specific question fully',
      'Confirm you actually answered it ("did that address what you were asking?")',
      "Clarify and re-answer if it didn't",
      'Offer to elaborate further if it did',
      'Bridge back explicitly to your story ("so, after that, I...")',
    ],
  },
  {
    id: 'follow-the-lead',
    heading: "Follow the interviewer's lead",
    body: 'If they keep steering toward one theme even though your story is about something else, that is them telling you what matters for this role — lean into it instead of dragging the conversation back to your planned structure.',
    items: [
      'Two questions in a row about testing likely means they value quality engineering — weave that into your next story before they have to ask',
    ],
  },
  {
    id: 'check-ins',
    heading: 'Use check-ins to build a real dialogue',
    body: 'Short questions like "should I go deeper on the technical side?" turn a monologue into a conversation and create natural breakpoints.',
    items: [
      'Use them at transitions between major parts of a story',
      "Not after every sentence — that reads as unsure of yourself rather than collaborative",
    ],
  },
  {
    id: 'handling-unexpected',
    heading: 'Handle a question you did not prep for',
    body: "When a competency question lands and you have no story ready for it, work down this list in order — and it only works well if your story bank was already built with related-competency pairings in mind.",
    items: [
      'The Related Story — adapt an adjacent story and name the connection explicitly',
      "The Hypothetical Approach — walk through how you'd handle it, grounded in real adjacent experience with a concrete mechanism, not a vague claim",
      'Distant Examples — reach outside recent work (school, volunteering, a hackathon), established quickly',
      'Honest Acknowledgment — "I don\'t have an example of that" is a legitimate answer, and can pivot into asking how they handle it',
    ],
  },
  {
    id: 'pyramid-for-follow-ups',
    heading: 'Run the Pyramid Method on every follow-up',
    body: "Each follow-up answer is its own miniature pyramid — the same structure your headline/core/landing story uses, applied recursively one level down.",
    items: [
      'Level 1 — a one-sentence direct answer, then check: "want more detail?"',
      'Level 2 — three to four sentences of expansion, then check again',
      'Level 3 — full implementation detail, only if they keep pulling',
      'Most follow-ups only need one or two levels — read whether they lean in or start wrapping up, rather than marching through all three automatically',
    ],
  },
  {
    id: 'stop-reading-faces',
    heading: 'Stop reading faces, start listening',
    body: 'Facial expressions are unreliable — a serious face can mean deep engagement, a bad day, or just someone concentrating — so watch for actual signals instead.',
    items: [
      'Follow-up questions, "we had something similar happen..." connections, note-taking, requests for more specifics, losing track of time',
      "When unsure how you're landing, default to a check-in rather than a guess",
    ],
  },
  {
    id: 'multi-interview-energy',
    heading: 'Manage energy across a multi-round loop',
    body: 'A full interview day is a pacing problem as much as a content problem — protect your physical and mental state, and vary what the panel actually hears.',
    items: [
      'Physical — stand and stretch between sessions, small steady snacks, use breaks to fully reset',
      'Mental — each interviewer meets you fresh; take 30 seconds to reconnect with what interests you about the role before each one',
      "Story variety — hiring panels compare notes afterward, so rotate different stories (or at least re-angle a repeated one) across the day",
      "Damage control — one weak round doesn't sink the loop; don't let it bleed into how the next interviewer reads you",
    ],
  },
];

/**
 * After the interview — closing the loop into the next one: capturing what
 * you learned while it's fresh, and the throughline the whole chapter builds
 * toward. Rendered by AfterInterviewSection.
 */
export const AFTER_INTERVIEW_TOPICS: InterviewPhaseTopic[] = [
  {
    id: 'learning-from-each-interview',
    heading: 'Learn from each interview immediately',
    body: 'Capture specifics while they are fresh, then extract the pattern rather than replaying every mistake in your head.',
    items: [
      'Questions you weren\'t prepared for — write them down verbatim and build a story or hypothetical answer for next time',
      'Stories that landed well — note why, so you can select stories strategically going forward',
      'Moments of confusion — where did communication actually break down',
      'Follow-ups that revealed a gap — if multiple interviewers at one company probe the same thing, that is a direct signal about what the role needs',
    ],
  },
  {
    id: 'building-stamina',
    heading: 'Build interview stamina over time',
    body: 'Every interview is genuinely easier than the last one — you learn which prep techniques work for you, which stories land, and how to adapt to different interviewer styles. Prioritize staying authentic over polishing a performance as you go.',
  },
  {
    id: 'path-to-natural-delivery',
    heading: 'Aim for natural delivery',
    body: 'Keep your story structure as the foundation, but build a genuine conversation on top of it rather than reciting it — delivery that feels like talking to an interested colleague, while still hitting your key points, is what gives interviewers something to advocate for in the hiring debrief.',
  },
];
