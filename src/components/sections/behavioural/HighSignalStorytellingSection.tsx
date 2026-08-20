import React from 'react';
import SectionHeading from '@/components/ui/SectionHeading';
import FrameworkStepList from '@/components/ui/FrameworkStepList';
import {
  HSS_PYRAMID_STEPS,
  BEHAVIORAL_CORE_STEPS,
  BASE_PREPARATION_CATEGORIES,
  HSS_RED_FLAGS,
  STAYING_PROFESSIONAL_TECHNIQUES,
  SIGNAL_EXAMPLES,
  NOISE_EXAMPLES,
} from '@/constants/behavioural/hss';

const HSS_CHAPTER_URL = 'https://bytebytego.com/courses/behavioral-interview/high-signal-storytelling';

const EXTERNAL_LINK_CLASS = 'text-blue-600 dark:text-blue-400 hover:underline font-medium';

const BULLET_CLASS =
  "text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700";

/**
 * The page's hero framework — High-Signal Storytelling (HSS) replaces STAR as
 * the primary way to structure a behavioral answer here, per ByteByteGo's own
 * critique that the default instinct to narrate a project chronologically
 * buries the actual signal (your thinking) under context an interviewer
 * doesn't need. STAR/CARL are demoted to a comparison reference rendered
 * immediately after this section by `StarCarlComparisonSection`, which this
 * component intentionally does not import — see that file for the mapping.
 * Synthesized in this site's own voice from ByteByteGo's "03 — High-Signal
 * Storytelling" chapter — see `src/constants/behavioural/hss.ts` for the
 * underlying data.
 */
const HighSignalStorytellingSection = () => (
  <section id="high-signal-storytelling" className="scroll-mt-24 mb-16">
    <SectionHeading
      eyebrow="The Core Framework"
      title="High-Signal Storytelling: lead with your thinking, not the scene"
    />

    <p className="mb-6 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
      This page teaches{' '}
      <a href={HSS_CHAPTER_URL} target="_blank" rel="noopener noreferrer" className={EXTERNAL_LINK_CLASS}>
        High-Signal Storytelling
      </a>{' '}
      as the primary way to structure every behavioral answer below, in place of STAR. The default
      instinct is to tell a project story — chronological, context-heavy, scene-setting. What an
      interviewer actually needs is a behavioral story — your thinking, your decisions, your
      actions — and every sentence spent on setup is a sentence not spent on the signal they&apos;re
      trying to write down. HSS is built as a pyramid instead of a narrative arc, shaped to match how
      an interviewer&apos;s notes actually fill up: a one-line summary first, then a handful of
      bulleted specifics, then whatever they scribble down while following up.
    </p>

    <FrameworkStepList steps={HSS_PYRAMID_STEPS} />

    <div className="mt-8">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">Building Your Headline</h3>
      <p className="mb-4 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        A headline gets ten to fifteen seconds, no more — long enough to confirm you understood the
        question, preview the action or decision at the center of the story, and say why it mattered,
        but short enough that it never turns into a second story of its own. Calibrate it carefully:
        a headline pitched above the level you&apos;re actually operating at — an entry-level candidate
        claiming org-wide platform impact, say — reads instantly as either inexperience or overreach,
        and an interviewer notices within the first sentence. If more than one story could answer the
        question well, you can offer the interviewer two headline options and let them pick which one
        to hear — it signals real depth of preparation and hands them control of where the
        conversation goes next. Then pause briefly after delivering it, so they have room to redirect
        you before you&apos;re two minutes into the wrong story.
      </p>
    </div>

    <div className="mt-8">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">Building Your Behavioral Core</h3>
      <p className="mb-4 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        The Core is where the actual evidence lives — two or three moments built the same way, each
        one carrying its own thought process, action, and result.
      </p>
      <FrameworkStepList steps={BEHAVIORAL_CORE_STEPS} />
    </div>

    <div className="mt-8">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">Preparing Your Base</h3>
      <p className="mb-4 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        The Base is never delivered up front — it&apos;s the depth you have ready underneath the
        Headline and Core, waiting for whichever direction the interviewer&apos;s follow-up questions
        actually take. Six categories cover most of what gets asked:
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BASE_PREPARATION_CATEGORIES.map((category) => (
          <div key={category.id} className="card-base p-4">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{category.category}</h4>
            <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{category.description}</p>
          </div>
        ))}
      </div>
    </div>

    <div className="mt-8">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">Signal vs. Noise</h3>
      <p className="mb-4 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        Signal is anything an interviewer would actually write down — your thoughts, your decisions,
        the specific action you took, how you worked with the people around you, and the result. Noise
        is everything else that feels natural to include but doesn&apos;t change what gets scored: the
        backstory, the roster, the justification for tools nobody asked about. A related habit worth
        building is just-in-time context — introduce a fact only at the exact moment it&apos;s needed
        to make a decision make sense, instead of front-loading it before the story has even started.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 mb-4">
        <div className="card-base p-4">
          <span className="text-micro text-zinc-400 mb-2 block">Signal</span>
          <ul className="space-y-1.5">
            {SIGNAL_EXAMPLES.map((example) => (
              <li key={example} className={BULLET_CLASS}>
                {example}
              </li>
            ))}
          </ul>
        </div>
        <div className="card-base p-4">
          <span className="text-micro text-zinc-400 mb-2 block">Noise</span>
          <ul className="space-y-1.5">
            {NOISE_EXAMPLES.map((example) => (
              <li key={example} className={BULLET_CLASS}>
                {example}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>

    <div className="mt-8">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">Red Flags to Avoid</h3>
      <p className="mb-4 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        Beyond weak structure, a handful of patterns actively damage a candidacy — these read as
        character and judgment signals, not just storytelling weaknesses, and a couple of them can
        land differently depending on the company across the table.
      </p>
      <ul className="space-y-1.5">
        {HSS_RED_FLAGS.map((flag) => (
          <li key={flag} className={BULLET_CLASS}>
            {flag}
          </li>
        ))}
      </ul>
    </div>

    <div className="mt-8">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">
        Staying Professional About Negative Experiences
      </h3>
      <p className="mb-4 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        Failures, conflicts, and layoffs all come up eventually — the goal isn&apos;t to avoid these
        stories, it&apos;s to narrate them without sounding bitter or evasive.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {STAYING_PROFESSIONAL_TECHNIQUES.map((technique) => (
          <div key={technique.id} className="card-base p-4">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{technique.technique}</h4>
            <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{technique.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HighSignalStorytellingSection;
