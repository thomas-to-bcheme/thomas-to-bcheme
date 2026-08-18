import React from 'react';
import SectionHeading from '@/components/ui/SectionHeading';
import Badge from '@/components/ui/Badge';
import {
  CAREER_LEVELS,
  LEVEL_DIMENSIONS,
  LEVEL_PITFALLS,
  LEVEL_SELF_CHECK_QUESTIONS,
  SENIOR_TO_STAFF_SHIFT,
  type CareerLevelId,
} from '@/constants/behavioural';

const LIST_ITEM_CLASS =
  "text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700";

/**
 * Badge color per rung of the ladder — purely presentational, kept out of
 * the constants file since color isn't content. Reads cool-to-warm as
 * scope grows, reusing the Badge component's existing palette (no new
 * tokens): zinc → green → blue → purple → amber → rose.
 */
const LEVEL_BADGE_COLORS: Record<CareerLevelId, 'zinc' | 'green' | 'blue' | 'purple' | 'amber' | 'rose'> = {
  junior: 'zinc',
  mid: 'green',
  senior: 'blue',
  staff: 'purple',
  seniorStaff: 'amber',
  principal: 'rose',
};

const LEVEL_BORDER_CLASSES: Record<CareerLevelId, string> = {
  junior: 'border-l-zinc-300 dark:border-l-zinc-600',
  mid: 'border-l-emerald-400 dark:border-l-emerald-500',
  senior: 'border-l-blue-400 dark:border-l-blue-500',
  staff: 'border-l-purple-400 dark:border-l-purple-500',
  seniorStaff: 'border-l-amber-400 dark:border-l-amber-500',
  principal: 'border-l-rose-400 dark:border-l-rose-500',
};

/**
 * General level-signaling framework, rendered once before the per-category
 * cards apply a senior/staff slice of it 6 more times. Walks the full
 * Junior→Principal ladder across 4 dimensions so a reader can see the
 * breadth (which teams/orgs are affected) and depth (how hard a trade-off
 * gets) that separates each rung, then calibrate their own stories against
 * the level they're interviewing for — or the one above it.
 */
const SeniorVsStaffSection = () => (
  <section id="senior-vs-staff" className="scroll-mt-24 mb-16">
    <SectionHeading
      eyebrow="The Career Ladder"
      title="From junior to principal — what shifts as scope grows"
    />

    <div className="card-base p-4 mb-4">
      <span className="text-micro text-zinc-400 mb-2 block">At a glance</span>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {CAREER_LEVELS.map((level) => (
          <div key={level.id}>
            <Badge color={LEVEL_BADGE_COLORS[level.id]} variant="outline">
              {level.label}
            </Badge>
            <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{level.summary}</p>
          </div>
        ))}
      </div>
    </div>

    <div className="grid gap-4 sm:grid-cols-2">
      {LEVEL_DIMENSIONS.map((dim) => (
        <div key={dim.id} className="card-base p-4">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">{dim.dimension}</h3>
          <div className="space-y-2.5">
            {CAREER_LEVELS.map((level) => (
              <div
                key={level.id}
                className={`rounded-lg border-l-2 pl-3 ${LEVEL_BORDER_CLASSES[level.id]}`}
              >
                <Badge color={LEVEL_BADGE_COLORS[level.id]} variant="outline">
                  {level.label}
                </Badge>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {dim.byLevel[level.id]}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>

    <div className="mt-8 card-base p-4">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">
        The senior &rarr; staff operating shift
      </h3>
      <div className="space-y-3">
        {SENIOR_TO_STAFF_SHIFT.map((row) => (
          <div key={row.id}>
            <span className="text-micro text-zinc-400 mb-1.5 block">{row.dimension}</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 border-l-2 border-l-blue-400 dark:border-l-blue-500 p-3">
                <Badge color="blue" variant="outline">
                  Senior
                </Badge>
                <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{row.senior}</p>
              </div>
              <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 border-l-2 border-l-purple-400 dark:border-l-purple-500 p-3">
                <Badge color="purple" variant="outline">
                  Staff
                </Badge>
                <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{row.staff}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      <div className="card-base p-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">Common pitfalls at any level</h3>
        <ul className="space-y-1.5">
          {LEVEL_PITFALLS.map((line) => (
            <li key={line} className={LIST_ITEM_CLASS}>
              {line}
            </li>
          ))}
        </ul>
      </div>

      <div className="card-base p-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">Before you tell the story</h3>
        <ul className="space-y-1.5">
          {LEVEL_SELF_CHECK_QUESTIONS.map((line) => (
            <li key={line} className={LIST_ITEM_CLASS}>
              {line}
            </li>
          ))}
        </ul>
      </div>
    </div>

    <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-500">
      Synthesized from Hello Interview&rsquo;s signal-area writeups and ByteByteGo&rsquo;s senior/staff/principal
      rubric and &ldquo;What Companies Are Looking For&rdquo; chapter.
    </p>
  </section>
);

export default SeniorVsStaffSection;
