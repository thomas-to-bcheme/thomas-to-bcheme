import SectionHeading from '@/components/ui/SectionHeading';
import {
  RUBRIC_DIMENSIONS,
  STAFF_LEVEL_DIFFERENTIATORS,
  HELLO_INTERVIEW_CROSS_REFERENCE,
} from '@/constants/systemDesignPrep/scoringRubric';

const LEVEL_LABELS: Record<number, string> = { 1: 'Needs work', 3: 'Solid', 5: 'Staff-level' };

const LIST_ITEM_CLASS =
  'text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-4 relative before:content-[\'—\'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700';

/**
 * 5-dimension self-assessment rubric, each dimension a card showing its
 * 1/3/5 anchor levels plus a practical tip, followed by staff-level
 * differentiators and a citation block cross-referencing Hello Interview's
 * own public 4 evaluation dimensions.
 */
const ScoringRubricSection = () => (
  <section id="scoring-rubric" className="scroll-mt-24 mt-20">
    <SectionHeading eyebrow="Self-Assessment" title="A 5-dimension scoring rubric" />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {RUBRIC_DIMENSIONS.map((dimension) => (
        <div key={dimension.id} className="card-base p-4 flex flex-col">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">{dimension.label}</h3>
          <ul className="space-y-2 flex-1">
            {dimension.levels.map((level) => (
              <li key={level.score} className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                <span className="font-bold text-zinc-900 dark:text-white">
                  {level.score} — {LEVEL_LABELS[level.score]}:
                </span>{' '}
                {level.description}
              </li>
            ))}
          </ul>
          <p className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
            {dimension.tip}
          </p>
        </div>
      ))}
    </div>

    <div className="mt-8 card-base p-4">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">
        What separates staff-level from passing
      </h3>
      <ul className="space-y-1.5">
        {STAFF_LEVEL_DIFFERENTIATORS.map((line) => (
          <li key={line} className={LIST_ITEM_CLASS}>
            {line}
          </li>
        ))}
      </ul>
    </div>

    <div className="mt-6 card-base p-4">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">
        Cross-referenced against Hello Interview&apos;s own 4 evaluation dimensions
      </h3>
      <dl className="space-y-3">
        {HELLO_INTERVIEW_CROSS_REFERENCE.map((entry) => (
          <div key={entry.dimension}>
            <dt className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{entry.dimension}</dt>
            <dd className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500 leading-relaxed">{entry.note}</dd>
          </div>
        ))}
      </dl>
    </div>
  </section>
);

export default ScoringRubricSection;
