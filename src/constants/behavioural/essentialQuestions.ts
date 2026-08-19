/**
 * The six questions ByteByteGo flags as showing up in nearly every behavioural
 * interview, regardless of company or level. Unlike the Part-II competency
 * questions (Initiative, Delivery, Problem-Solving, Innovation, Strategic
 * Leadership), these are shorter and more direct — most don't call for the
 * full HSS structure, with Q2 ("proud of a project") the deliberate
 * exception, since it's the one variant where you choose your own story and
 * therefore still leans on the full headline → behavioral core → follow-up
 * shape.
 *
 * Each question keeps its own internal shape in `sections` rather than a
 * shared template, because the six genuinely differ in structure: Q1 and Q5
 * are named frameworks with ordered steps, Q3 layers research guidance on
 * top of an answer structure, Q4 branches entirely by interviewer audience,
 * and Q6 branches by scenario instead. Forcing all six into one subsection
 * shape would flatten real differences the notes actually draw out.
 *
 * Synthesized in this site's own voice from ByteByteGo's "The Essential
 * Questions" chapter — paraphrased, not quoted. See
 * `bytebytego_behavioral_interview_notes.md` §5.
 */

export interface EssentialQuestionSubsection {
  heading: string;
  items: string[];
}

export interface EssentialQuestion {
  id: string;
  questionNumber: number;
  title: string;
  prompt: string;
  tests: string;
  sections: EssentialQuestionSubsection[];
}

export const ESSENTIAL_QUESTIONS: EssentialQuestion[] = [
  {
    id: 'tell-me-about-yourself',
    questionNumber: 1,
    title: '"Tell Me About Yourself"',
    prompt: 'Walk me through your background.',
    tests:
      'Sets the first impression of your communication, technical background, and professional maturity — it establishes the tone for the rest of the interview.',
    sections: [
      {
        heading: 'Framework — Power of Three',
        items: [
          "Professional Identity & Career Summary — two to three sentences covering your role, specialization, and a brief trajectory across at most two or three companies. This is a trajectory, not a full career history.",
          'Three Defining Elements — pick three from technical specialties, major accomplishments, working-style traits, or problems you’re genuinely passionate about.',
          'Connection to Role — explicitly tie those three elements back to the specific position you’re interviewing for.',
        ],
      },
      {
        heading: 'Common Pitfalls',
        items: [
          'Starting with unrelated bio or background info that doesn’t serve the story.',
          'Walking through your resume chronologically instead of summarizing your trajectory.',
          'Listing your tech stack with no context for why it matters.',
          'Talking past the two-minute mark.',
          'Being too modest, or overselling in the other direction.',
          'Diving into technical implementation detail this early in the conversation.',
        ],
      },
      {
        heading: 'Pro Tips',
        items: [
          'Write it out and rehearse it until it sounds natural, not like corporate-speak.',
          'Reuse the Progressive Practice approach from the general prep framework to drill delivery.',
          'Adjust emphasis depending on whether you’re talking to a recruiter or a technical interviewer.',
          'An optional brief personal note at the end is fine if it’s genuinely relevant.',
          'Lead with your most recent, most relevant achievements.',
        ],
      },
    ],
  },
  {
    id: 'project-youre-proud-of',
    questionNumber: 2,
    title: '"Tell Me About a Project You\'re Proud Of / Most Complex / Most Technically Challenging"',
    prompt:
      "Tell me about a project you're proud of, or the most complex or technically challenging thing you've built.",
    tests:
      'The one variant of this question where you choose the topic yourself — your chance to lead with the story that shows you at your best.',
    sections: [
      {
        heading: 'Approach',
        items: [
          'Pull from your competency story bank (Initiative, Delivery, Problem-Solving, Innovation, Strategic Leadership) based on which variant — proud, complex, or challenging — is actually asked.',
          'Structure the answer with the HSS structure: a headline that frames the story, a behavioral core covering your actual decisions and actions, then let the interviewer’s follow-up questions pull additional detail from that same base.',
        ],
      },
      {
        heading: 'If Nothing Comes to Mind, Reframe',
        items: [
          'Projects that required real learning — the climb to get there, not just your current familiarity with the subject.',
          'Boring-sounding projects with hidden complexity — scale, optimization, or reliability work that doesn’t look exciting on the surface.',
          'Projects that prevented problems — monitoring or preventive engineering that never became a visible incident.',
          'Small-scope work with big impact — don’t discount a project for its size; look at what it actually changed.',
        ],
      },
      {
        heading: 'Common Pitfalls',
        items: [
          'Spending the core of the story on background instead of your actual decisions and actions.',
          'Not separating what “I” did from what “the team” did.',
          'Describing technical complexity with no business impact stated.',
          'Picking a project where your own role in it is unclear.',
          'Front-loading implementation detail that belongs in the behavioral core, not the headline.',
          'Not prepping the base story at all, so it can’t sustain follow-up questions.',
        ],
      },
      {
        heading: 'Pro Tips',
        items: [
          'Prep one strong headline per variant — proud, complex, challenging — the core can stay mostly the same underneath.',
          'Cap the core at roughly two minutes.',
          'Be honest about what was actually hard — authenticity reads better than pretending it was easy.',
        ],
      },
    ],
  },
  {
    id: 'why-this-company-role',
    questionNumber: 3,
    title: '"Why This Company / Role?"',
    prompt: 'Why do you want to work here, and why this role specifically?',
    tests:
      "Whether you've done real homework and have a genuine reason for applying — interviewers use it to gauge how likely you are to accept an offer and stick around, so it carries extra weight in final rounds.",
    sections: [
      {
        heading: 'Investment Level',
        items: [
          'Reserve roughly one to two hours of focused research once an interview is actually on the calendar — not for every company you apply to broadly.',
        ],
      },
      {
        heading: 'Research the Team, Not Just the Company',
        items: [
          'Most roles are team-specific hires, so look up your actual interviewers and team on LinkedIn.',
          'Search for team-tagged blog posts, GitHub ownership, and release notes.',
          'Immerse yourself in the team’s actual product or domain.',
          'Look for recent launches, roadmap hints, and conference talks given by the team.',
          'If you can’t identify the team in advance, ask the recruiter directly which team or org you’d be joining.',
          'Exception: some companies hire into a general pool and match teams later — research the company and domain broadly instead in that case.',
        ],
      },
      {
        heading: 'Research Depth by Team Type',
        items: [
          'Product teams — become a power user of the product itself.',
          'Backend, infra, or platform teams — read engineering blogs and postmortems, check open-source contributions, and watch for tech-stack signals in the job posting.',
          'B2B teams — sign up for a trial and do competitive analysis against alternatives.',
          'Everywhere — GitHub activity, published talks, Hacker News threads, Glassdoor reviews read between the lines, and LinkedIn alumni career paths.',
        ],
      },
      {
        heading: 'Know Your Own Priorities First',
        items: [
          'Get clear on what you actually want — technical growth, the type of impact you’re after (user-facing vs. foundational), culture and practices, domain interest — before researching, so the research stays targeted instead of generic.',
        ],
      },
      {
        heading: 'Answer Structure',
        items: [
          'Specific Research Insight → Your Relevant Experience → Mutual Value: what you’d bring to the team and what genuinely excites you about it, not just what you’d personally gain.',
        ],
      },
      {
        heading: 'Common Pitfalls',
        items: [
          'Surface-level "About Us" page research and nothing deeper.',
          'Generic gushing praise with no specifics behind it.',
          'Only talking about what you’d personally gain from the role.',
          'Reciting the job description back at the interviewer.',
          'Mentioning perks — free food, remote work, commute — as your reason for applying.',
          'Signaling desperation, like "I really need this job."',
          'Asking questions that only get you a marketing answer.',
        ],
      },
      {
        heading: 'Pro Tips',
        items: [
          'Team-specific research differentiates you immediately from candidates who only researched the company.',
          'Ask the recruiter which team you’d join if it isn’t already clear.',
          'Research your interviewers individually on LinkedIn.',
          'Cite specific technical decisions the team made, not just the general tech stack.',
          'Connect multiple sources together when you ask questions — it signals real synthesis, not a single search.',
          'Be genuinely curious — forced enthusiasm shows.',
          'Tailor your answer to the audience: a technical interviewer vs. a hiring manager want different emphasis.',
          'Show you understand the business constraints the team is actually operating under.',
        ],
      },
    ],
  },
  {
    id: 'questions-for-interviewer',
    questionNumber: 4,
    title: '"Do You Have Any Questions for Me?"',
    prompt: 'Do you have any questions for me?',
    tests: 'Whether you’re evaluating them too — never answer "no."',
    sections: [
      {
        heading: 'Tailor Questions to the Audience',
        items: [
          'Recruiter/HR — the only audience for compensation, benefits, process and timeline, salary range, performance-eval structure, and team-structure questions.',
          'Technical team members — ask about the feature-work-to-tech-debt ratio, what support and resources they get, how technical decisions actually get made (a read on autonomy vs. micromanagement), what they’d change, or what they learned from a recent launch.',
          'Hiring managers — ask what you’d be assigned immediately (reveals their real priorities), how long the role has been open (urgency or red-flag signal), the onboarding and ramp process, and team tenure (an indirect stability signal).',
          'Cross-functional partners (PM, design, data) — ask how their team actually collaborates with engineering (partnership vs. order-taking), how the roadmap gets prioritized, what’s been harder than expected, or specific product-behavior questions if you’ve used it.',
        ],
      },
      {
        heading: 'Avoid',
        items: [
          'Questions answerable from the About page or already covered earlier in the conversation.',
          'Comp or benefits questions asked to anyone other than the recruiter.',
          'Desperation questions, like "How did I do?" or "How many other candidates are there?"',
          'Questions that only get you a marketing answer, like "What’s great about working here?"',
          'Distant hypotheticals, like "Where do you see the company in ten years?"',
        ],
      },
      {
        heading: 'Pro Tips',
        items: [
          'Prepare five to seven questions going in — some will already get answered along the way.',
          'Specific questions get specific, honest answers; vague questions get vague ones back.',
          'Escalate depth by interview stage — early rounds: role and team; later rounds: challenges and direction; final round: how you’d actually contribute.',
        ],
      },
    ],
  },
  {
    id: 'biggest-weakness',
    questionNumber: 5,
    title: '"What\'s Your Biggest Weakness?"',
    prompt: "What's your biggest weakness?",
    tests: 'Self-awareness, honesty, and whether you’re actively working to improve — not the weakness itself.',
    sections: [
      {
        heading: 'Three-Part Structure',
        items: [
          'Select a real weakness — honest and non-disqualifying for this specific role, ideally one you’ve actually received feedback on. Weigh it against what the role actually needs (delegation matters far more for a senior or lead role than a junior IC role).',
          'Give specific context — one real example, one to two sentences max, just enough to prove it’s real.',
          'Active improvement — the bulk of the answer, roughly two to three times longer than the weakness description itself: concrete behavioral changes, seeking out help or mentorship, building a system or checklist, deliberate skill development, and how you’re actually measuring progress. Recent, specific progress lands best.',
        ],
      },
      {
        heading: 'The Strength-as-Weakness Caveat',
        items: [
          'Only valid if it genuinely caused a real problem, not a disguised brag — for example, thoroughness tipping into over-investment on marginal gains. A "weakness" with no real cost attached reads as fake.',
        ],
      },
      {
        heading: 'Four Failure Patterns to Avoid',
        items: [
          'The Humblebrag — "I work too hard."',
          'The Fake or Cliché Weakness — "I’m a perfectionist," with no specifics behind it.',
          'The Vague Weakness With No Action — "I struggle with communication sometimes."',
          'The Disqualifying Weakness — a weakness that’s core to the job itself, which just raises the question of why you’re applying.',
        ],
      },
      {
        heading: 'If Nothing Comes to Mind, Mine These Sources',
        items: [
          'Patterns in recent performance-review feedback.',
          'Feedback you’ve heard from multiple people independently.',
          'A specific mistake and its root cause.',
          'A skill a colleague has that doesn’t come naturally to you.',
          'A moment you were genuinely frustrated with your own performance.',
        ],
      },
      {
        heading: 'Pro Tips',
        items: [
          'Pick something you’re actively working on right now.',
          'Show self-awareness without tipping into self-deprecation.',
          'The improvement journey is the point, not the starting weakness itself.',
          'Make sure it genuinely can’t disqualify you for the role.',
          'Bring a recent, concrete data point on your progress.',
        ],
      },
    ],
  },
  {
    id: 'why-are-you-looking',
    questionNumber: 6,
    title: '"Why Are You Looking? / Why Did You Leave? / Resume Gaps"',
    prompt:
      "Why are you looking for a new role, why did you leave your last one, or what happened during this gap on your resume?",
    tests:
      'How deliberate your move is, and screens for red flags — fleeing self-created problems, badmouthing past employers, unstable resume patterns, or a story that doesn’t quite add up.',
    sections: [
      {
        heading: 'Core Principle',
        items: [
          'You don’t owe specifics. "It wasn’t a good fit" is sufficient and true — you don’t need to disclose being fired, put on a PIP, or asked to leave. If you made it to the interview, whatever gap or pattern is on your resume already wasn’t disqualifying, so don’t over-apologize or over-explain.',
        ],
      },
      {
        heading: 'Answer Shape',
        items: [
          'Brief context (if any) → what you’re looking for → why this role specifically fits it. Target thirty seconds to one minute total.',
        ],
      },
      {
        heading: 'Guidance by Scenario',
        items: [
          'Voluntary departure — frame it toward what you’re moving toward (growth, learning, impact, company-stage change, a stronger technical culture), never toward what you’re fleeing; keep any mention of your current employer neutral-to-positive.',
          'Layoff — not your fault, no shame in it, very common in tech; state it factually with brief context, then pivot immediately to what you’re seeking next.',
          'Bad-fit ending — "It wasn’t a good fit," optionally one sentence on the lesson learned if pressed; don’t volunteer more than that.',
          'Resume gaps (job search after a layoff, caregiving, health) — one to two neutral sentences, then pivot to your readiness and excitement now; the same non-apologetic principle applies.',
          'One short tenure — easy to handle: "wasn’t a good fit" plus a one-line lesson learned.',
          'Multiple short tenures — needs a bit more care: give a different, specific reason per role so it’s clear these weren’t the same mistake repeated, then state clearly that you’re deliberately seeking a long-term fit now.',
        ],
      },
      {
        heading: 'Pro Tips',
        items: [
          'Keep the story identical across every interviewer at the same company — inconsistency is itself a red flag.',
          'Practice delivering the short version without the urge to elaborate further.',
          'For genuinely difficult or emotional situations, consider working through it with a therapist first so you can discuss it neutrally in the room.',
        ],
      },
    ],
  },
];
