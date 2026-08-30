import SectionHeading from '@/components/ui/SectionHeading';
import { REAL_WORLD_DESIGNS, type RealWorldDesignPoint } from '@/constants/systemDesignPrep/realWorldDesigns';
import { SYSTEM_DESIGN_QUESTIONS } from '@/constants/systemDesignPrep/questions';
import { REFERENCE_GRID_COLUMNS } from '@/constants/systemDesignPrep/referenceGrid';

/**
 * Resolves a RealWorldDesignPoint's optional `linkId` against both existing
 * id spaces on this page (the question-bank decision cascades and the
 * Reference Grid entries) — the same "look it up, drop it if it's gone"
 * defensive pattern SystemDesignQuestionCard uses for `ripplesInto`, so a
 * future rename in either source file can't silently produce a dead anchor
 * here. Built once at module scope rather than per-render.
 */
const LINK_TARGET_LABELS = new Map<string, string>([
  ...SYSTEM_DESIGN_QUESTIONS.map((question): [string, string] => [question.id, question.question]),
  ...REFERENCE_GRID_COLUMNS.flatMap((column) =>
    column.entries.map((entry): [string, string] => [entry.id, entry.label]),
  ),
]);

const POINT_CLASS =
  'text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-4 relative before:content-[\'—\'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700';

const REQUIREMENT_CLASS =
  'text-sm text-zinc-500 dark:text-zinc-500 leading-relaxed pl-4 relative before:content-[\'—\'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700';

interface DesignPointItemProps {
  point: RealWorldDesignPoint;
}

const DesignPointItem = ({ point }: DesignPointItemProps) => {
  const linkLabel = point.linkId ? LINK_TARGET_LABELS.get(point.linkId) : undefined;

  return (
    <li className={POINT_CLASS}>
      {point.text}
      {linkLabel && (
        <>
          {' — see '}
          <a
            href={`#${point.linkId}`}
            title={linkLabel}
            className="font-semibold text-blue-700 dark:text-blue-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded-sm"
          >
            {linkLabel} →
          </a>
        </>
      )}
    </li>
  );
};

interface DesignPointListProps {
  label: string;
  points: RealWorldDesignPoint[];
}

const DesignPointList = ({ label, points }: DesignPointListProps) => (
  <div>
    <span className="text-micro text-zinc-400">{label}</span>
    <ul className="mt-2 space-y-1.5">
      {points.map((point) => (
        <DesignPointItem key={point.text} point={point} />
      ))}
    </ul>
  </div>
);

/**
 * The "now apply the decision cascades to a real system" payoff — six
 * classic worked designs (Requirements + Key Components + Scale
 * Strategies), each kept concise since this is a synthesis/index over
 * decisions already argued in full elsewhere on the page, not a restatement
 * of them. `ExternalReferencesSection`'s "Practice these next" panel links
 * here directly (`href="#real-world-designs"`), so this section's id is a
 * load-bearing anchor target, not just a naming convention.
 */
const RealWorldDesignsSection = () => (
  <section id="real-world-designs" className="mt-16 scroll-mt-24">
    <SectionHeading eyebrow="Synthesis" title="Six classic designs, worked end to end" />
    <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-10">
      The individual decision cascades above compose into real systems. Each design below is
      requirements, key components, and scale strategies — a few lines each — cross-linked back
      into the cascades that already cover a given trade-off in full, rather than re-deriving it
      here.
    </p>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {REAL_WORLD_DESIGNS.map((design) => (
        <article key={design.id} id={design.id} className="card-base p-5 scroll-mt-24 space-y-4">
          <div>
            <span className="text-micro text-zinc-400">{design.tagline}</span>
            <h3 className="mt-1 text-base font-bold text-zinc-900 dark:text-white leading-snug">
              {design.name}
            </h3>
            <ul className="mt-3 space-y-1.5">
              {design.requirements.map((requirement) => (
                <li key={requirement} className={REQUIREMENT_CLASS}>
                  {requirement}
                </li>
              ))}
            </ul>
          </div>

          <DesignPointList label="Key Components" points={design.keyComponents} />
          <DesignPointList label="Scale Strategies" points={design.scaleStrategies} />
        </article>
      ))}
    </div>
  </section>
);

export default RealWorldDesignsSection;
