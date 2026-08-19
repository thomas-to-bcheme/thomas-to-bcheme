import React from 'react';
import SectionHeading from '@/components/ui/SectionHeading';
import FrameworkStepList from '@/components/ui/FrameworkStepList';
import {
  THREE_PILLARS_STEPS,
  STORY_COUNT_BY_COMPANY_TYPE,
  STORY_COUNT_BY_LEVEL,
  STORY_MINING_MOMENTS,
  MATCHING_COMPANY_VALUES_STEPS,
  READING_PATH_RECOMMENDATIONS,
} from '@/constants/behavioural/roadmap';

const EXTERNAL_LINK_CLASS = 'text-blue-600 dark:text-blue-400 hover:underline font-medium';

const BULLET_CLASS =
  "text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700";

/**
 * The prep roadmap that follows BehaviouralIntroEssay on /behavioural — the
 * three pillars of preparation, how many stories that actually requires by
 * company type and by level, where to mine a single project for more than
 * one story, the research-your-gaps loop for matching company values, and a
 * short reading-path router by timeline. Synthesized in this site's own
 * voice from ByteByteGo's "The Behavioral Interview Roadmap" chapter — see
 * `src/constants/behavioural/roadmap.ts` for the underlying data.
 */
const RoadmapSection = () => (
  <section id="roadmap" className="scroll-mt-24 mb-16">
    <SectionHeading eyebrow="The Prep Roadmap" title="Three pillars, and how much prep they actually take" />

    <p className="mb-4 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
      <a
        href="https://bytebytego.com/courses/behavioral-interview/the-behavioral-interview-roadmap"
        target="_blank"
        rel="noopener noreferrer"
        className={EXTERNAL_LINK_CLASS}
      >
        The course
      </a>{' '}
      breaks preparation into three pillars that all have to land together — a strong story at the
      wrong level fails the same way a right-level story fails when it misses what the company
      actually rewards.
    </p>
    <FrameworkStepList steps={THREE_PILLARS_STEPS} />

    <div className="mt-8">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">How many stories do you need?</h3>
      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        Every company asks some version of three or four essential questions, so that floor is
        fixed. What varies is how many additional competencies you need stories for — which
        depends on the kind of company you&apos;re talking to and the level you&apos;re targeting.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card-base p-4">
          <span className="text-micro text-zinc-400 mb-2 block">By company type</span>
          <div className="space-y-3">
            {STORY_COUNT_BY_COMPANY_TYPE.map((entry) => (
              <div key={entry.id}>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{entry.companyType}</h4>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{entry.guidance}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="card-base p-4">
          <span className="text-micro text-zinc-400 mb-2 block">By level</span>
          <div className="space-y-3">
            {STORY_COUNT_BY_LEVEL.map((entry) => (
              <div key={entry.id}>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{entry.level}</h4>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{entry.guidance}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    <div className="mt-8">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">Mining your experiences</h3>
      <p className="mb-4 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        The instinct is to treat one big project as one story. It isn&apos;t — a multi-month effort
        usually contains several distinct behavioural moments, each one a separate story about a
        different competency. A six-month platform migration, for example, might quietly hand you a
        story about the early call to change approach, a separate story about talking a skeptical
        team into the new design, and a third about the outage you caught and fixed before it hit
        customers — three stories, one project. Go back through your own significant projects,
        hard situations, and role transitions looking for moments where you:
      </p>
      <ul className="space-y-1.5">
        {STORY_MINING_MOMENTS.map((moment) => (
          <li key={moment} className={BULLET_CLASS}>
            {moment}
          </li>
        ))}
      </ul>
    </div>

    <div className="mt-8">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">Matching company values</h3>
      <p className="mb-4 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        The same true story can be told to foreground different things — which lens to lead with
        depends on what the company in front of you actually values.
      </p>
      <FrameworkStepList steps={MATCHING_COMPANY_VALUES_STEPS} />
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        The one hard rule underneath all of this: only tell stories that actually happened. Choosing
        which real experience or which angle of it to emphasize is the skill — inventing one isn&apos;t,
        and it&apos;s a risk that ranges from an awkward follow-up question to ending a candidacy on
        the spot.
      </p>
    </div>

    <div className="mt-8">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">How to use this page</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {READING_PATH_RECOMMENDATIONS.map((recommendation) => (
          <div key={recommendation.id} className="card-base p-4">
            <span className="text-micro text-zinc-400 mb-2 block">{recommendation.scenario}</span>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{recommendation.path}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default RoadmapSection;
