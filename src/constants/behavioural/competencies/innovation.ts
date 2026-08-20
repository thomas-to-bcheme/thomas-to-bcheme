import type { CompetencyChapter } from './types';

export const INNOVATION: CompetencyChapter = {
  id: 'innovation',
  chapterNumber: 11,
  title: 'Innovation',
  sourceUrl: 'https://bytebytego.com/courses/behavioral-interview/innovation',
  openingHook:
    'Every engineer optimizes constantly — the harder and rarer move is noticing when optimizing the existing approach is actually the wrong move entirely, and building something that makes the old problem disappear instead.',
  definition:
    'Inventing a genuinely new approach to a problem, not making an existing approach work better — the trait Google evaluates explicitly in hiring, and the instinct behind Apple\'s "Think Different" and Tesla\'s commitment to constantly reinventing how its own products work.',
  keyDistinction: {
    label: 'Innovation vs. Optimization',
    explanation:
      "Optimization takes an existing method and makes it work better — adding a cache in front of a slow synchronous call between two services. Innovation replaces the method entirely so the original problem stops existing — replacing that same synchronous, point-to-point coupling with an event-driven architecture, so the calling service no longer needs to know the downstream service exists at all. The test: could someone else have reached the same result by refining what already existed? If yes, it's optimization. If it required inventing something incremental refinement couldn't reach, it's innovation. Sometimes you set out to optimize and realize partway through that only a new approach will actually work — that pivot is itself the innovation story.",
  },
  centralTension:
    'Pure creativity with no constraints produces ideas that are interesting but impractical; pure feasibility-focus never risks anything ambitious enough to count as new. The best innovation resolves this by simplifying — it removes a layer of complexity the old approach required, rather than adding a clever new layer on top of it.',
  culturalConsiderations:
    "How much room an organization gives you to actually invent something tracks its risk tolerance more than its size: a startup will let an engineer rebuild a core system on a hunch, while a regulated or process-heavy org expects a validated case before it will let you touch production this way. Scope of adoption also scales with level — solving it for yourself is an entry-level story, spreading it to teammates is mid-level, building it deliberately for the whole team is senior, crossing team boundaries is staff, and becoming an org- or industry-wide standard is principal — and interviewers will sometimes ask a senior-scoped innovation question of a junior candidate just to see how they reason about it, not because they expect senior-scale adoption.",
  namedCompanyValues: [
    { company: 'Google', value: 'Innovation evaluated explicitly in hiring' },
    { company: 'Apple', value: 'Think Different' },
    { company: 'Tesla', value: 'Constantly Innovate' },
  ],
  relatedCompetencies: [
    {
      id: 'learning-and-growth',
      relationship:
        'Learning builds the capability you personally draw on; innovation is what you build once that capability lets you see a problem differently than the existing approach does.',
    },
    {
      id: 'developing-others',
      relationship:
        "Innovation creates a new tool or approach; developing others is the separate skill of transferring that capability outward so it doesn't stay locked in your own head.",
    },
  ],
  questionCategories: [
    {
      id: 'creating-new-solutions',
      label: 'Creating New Solutions',
      exampleQuestion: "Tell me about the most innovative thing you've built, and why it was innovative rather than just an improvement.",
    },
    {
      id: 'improvement-questions-either-way',
      label: 'Improvement Questions That Can Go Either Way',
      exampleQuestion: 'Tell me about improving something that was already working fine.',
    },
    {
      id: 'implementing-novel-ideas',
      label: 'Implementing Novel Ideas',
      exampleQuestion: 'Describe convincing others to try an approach you invented that nobody had used before.',
    },
    {
      id: 'validating-and-iterating',
      label: 'Validating and Iterating',
      exampleQuestion: "Tell me about a time your first innovative attempt didn't work.",
    },
  ],
  sampleQuestions: [
    {
      id: 'inventing-a-new-approach',
      category: 'Creating New Solutions',
      prompt:
        "Tell me about the most innovative thing you've built, and walk me through why it was a genuinely new approach rather than an improvement on the existing one.",
      framingNotes:
        "Tests whether you can draw the innovation/optimization line honestly on your own work — the trap is calling a well-executed performance fix or feature addition 'innovative' because it was hard, when it was really the existing approach done well.",
      hssGuidance: {
        contextHint:
          'Establish concretely what the existing approach was and why refining it further had a real ceiling — that ceiling is what makes the new approach necessary rather than merely nice to have.',
        headlineHint: 'Your headline should assert what old problem disappeared, not just what you built.',
        behavioralCoreMoments: [
          "The moment you realized incremental improvement wouldn't get you there, and what convinced you a different approach was needed.",
          'The core idea of the new approach and why it removed complexity rather than adding a new layer to manage the old problem.',
          "Evidence that others adopted it beyond your own use of it — that's what confirms it solved a real problem, not just a personally interesting one.",
        ],
      },
      levelSignal: {
        junior: 'Invents a small new approach that solves a real problem in their own individual work, even if nobody beyond them has adopted it yet.',
        mid: 'Invents a new approach inside their own feature or workstream and gets teammates to adopt it too, beyond just their own use of it.',
        senior: 'Builds a new approach deliberately for their whole team, replacing a known limitation with something the team adopts as the new default.',
        staff: 'Builds a new approach that crosses team boundaries, changing how more than one team solves a shared class of problem going forward.',
        seniorStaff:
          'Builds a new approach that becomes the default across a whole product area, with multiple staff engineers and their teams adopting it as the standard.',
        principal:
          "Builds a new approach that becomes an org-wide or industry-wide standard, reshaping how many divisions — or other companies — solve the same class of problem.",
      },
      workedExample: {
        level: 'staff',
        story:
          "I retired a fraud-scoring rules engine — hundreds of hand-tuned if/else thresholds three teams were each patching independently — and replaced it with a single trained model, because no amount of further threshold tuning could close the gap between what the rules could express and what the data actually showed. I built a shared feature store the model trained against and all three teams' services read from at inference time, eliminating the training-serving skew that came from each team computing similar features slightly differently in their own service. Fraud catch rate improved by double digits, and the three teams stopped shipping conflicting threshold changes into the same underlying decision.",
      },
    },
    {
      id: 'iterating-past-a-failed-first-attempt',
      category: 'Validating and Iterating',
      prompt: "Tell me about a time your first innovative attempt at something didn't work. What did you do next?",
      framingNotes:
        "Tests whether you validate and iterate on new ideas or treat the first version as the whole bet — the trap is a story that ends at the failed attempt instead of showing what you learned and changed.",
      hssGuidance: {
        contextHint:
          "Name what specifically failed about the first attempt — a wrong assumption, an unanticipated constraint — rather than a vague 'it didn't work.'",
        headlineHint: 'Your headline should assert what you learned from the failed attempt that shaped the version that actually worked.',
        behavioralCoreMoments: [
          'The signal that told you the first attempt had failed, and how quickly you recognized it rather than pushing a broken approach further.',
          'What you changed in the second attempt because of that specific failure, not a from-scratch restart.',
          "The confirmed outcome of the revised approach, including whether it was adopted where the first attempt wasn't.",
        ],
      },
      levelSignal: {
        junior: 'Recognizes when their own first attempt at a new approach did not work, asks for help diagnosing why, and ships a corrected version with guidance.',
        mid: 'Recognizes when their own first attempt at a new approach falls short, diagnoses the specific cause themselves, and ships a corrected version their team adopts.',
        senior: 'Recognizes their own failed first attempt quickly, iterates based on the specific reason it fell short, and lands an adopted version within their team.',
        staff:
          'Treats a failed first attempt as a signal about a flawed shared assumption across teams, and course-corrects the approach so the second attempt succeeds where multiple teams had separately struggled.',
        seniorStaff:
          'Treats a failed first attempt as a signal about a flawed assumption held across a whole product area, and resets the approach so the corrected version becomes the standard other staff engineers and their teams adopt.',
        principal:
          "Treats a failed first attempt at an org-wide approach as a signal the whole company was reasoning about the problem incorrectly, and resets the direction so the corrected version becomes the org's new standard.",
      },
      workedExample: {
        level: 'junior',
        story:
          "My first attempt at automating a manual weekly report broke because I'd assumed the source spreadsheet's column order was fixed, and reading by header name instead of position was what actually made the automation reliable. I flagged the mislabeled output to my lead as soon as I noticed it rather than letting it run unnoticed, then rewrote the script to read columns by header with a mentor reviewing the fix. The corrected version ran unattended for the rest of the quarter with no further mislabeling incidents.",
      },
    },
  ],
  keySignals: [
    "Inventing something that solves a real, validated problem — novelty by itself isn't the signal.",
    'Simplifying the problem rather than adding a new layer of complexity to manage it.',
    'Practical implementation — an idea that was never built does not count, no matter how good it was.',
    'Learning from a prior failed attempt instead of abandoning the direction entirely.',
  ],
  redFlags: [
    "Calling a performance fix or bug fix 'innovation' when it was actually optimization of the existing approach.",
    'Jumping straight to the clever idea without establishing why the existing approach was actually inadequate.',
    'An over-engineered solution that needs a long explanation just to justify its own complexity.',
    'Nobody actually adopted it — the idea stayed a personal experiment.',
    'Describing an idea you never implemented, when your context genuinely would have allowed you to.',
  ],
  reflectionQuestions: [
    'What have you built that made an old problem disappear entirely, rather than just making the old approach faster?',
    'When did you start out trying to optimize something and realize partway through that only a new approach would actually work?',
    "What's a first attempt at something new that failed — and what did the second attempt look like because of it?",
  ],
  keyTakeaways: {
    strongStoriesInclude: [
      "A clear statement of why the existing approach wasn't sufficient, before introducing the new one.",
      'A genuinely new approach, not a refinement dressed up as one.',
      'Evidence of adoption by others, not just personal use.',
      'Evidence you iterated based on feedback or a failed first attempt.',
    ],
    avoidTheseTraps: [
      'Labeling a straightforward fix or improvement as innovation because it was hard.',
      'Skipping the justification for why the old approach had a real ceiling.',
      'Describing an idea that was clever but never actually built.',
      'Over-explaining a solution so complex nobody else could adopt it.',
    ],
  },
};
