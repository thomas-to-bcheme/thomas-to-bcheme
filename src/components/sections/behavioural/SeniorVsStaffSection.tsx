import React from 'react';
import SectionHeading from '@/components/ui/SectionHeading';
import Badge from '@/components/ui/Badge';
import {
  CAREER_LEVELS,
  LEVEL_DIMENSIONS,
  LEVEL_PITFALLS,
  LEVEL_SELF_CHECK_QUESTIONS,
  SENIOR_TO_STAFF_SHIFT,
  SELF_ASSESSMENT_GUIDANCE,
} from '@/constants/behavioural/careerLevels';
import { LEVEL_BADGE_COLORS, LEVEL_BORDER_CLASSES } from '@/lib/careerLevelPresentation';

const LIST_ITEM_CLASS =
  "text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700";

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
        Self-assessment: where do your stories actually land?
      </h3>
      <ol className="space-y-1.5 mb-4">
        {SELF_ASSESSMENT_GUIDANCE.process.map((step, index) => (
          <li key={step} className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-6 relative">
            <span className="absolute left-0 top-0 text-xs font-bold text-zinc-400">{index + 1}.</span>
            {step}
          </li>
        ))}
      </ol>
      <span className="text-micro text-zinc-400 mb-2 block">If a specific dimension is weak</span>
      <div className="grid gap-3 sm:grid-cols-2">
        {SELF_ASSESSMENT_GUIDANCE.fixesByDimension.map((fix) => {
          const dimensionLabel =
            LEVEL_DIMENSIONS.find((dim) => dim.id === fix.dimensionId)?.dimension ?? fix.dimensionId;
          return (
            <div
              key={fix.dimensionId}
              className="rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 p-3"
            >
              <span className="block mb-1 text-xs font-bold text-zinc-900 dark:text-white">{dimensionLabel}</span>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{fix.ifWeak}</p>
            </div>
          );
        })}
      </div>
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
