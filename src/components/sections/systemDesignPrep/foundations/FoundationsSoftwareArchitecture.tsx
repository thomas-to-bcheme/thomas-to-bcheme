import { Scale } from 'lucide-react';
import {
  ARCHITECTURE_LAWS,
  ARCHITECTURE_CONCEPTS,
  ARCHITECTURE_STYLES,
  type ArchitectureStyle,
} from '@/constants/systemDesignPrep/foundations';
import FoundationsSubsectionHeading from './FoundationsSubsectionHeading';
import FoundationsAccordion from './FoundationsAccordion';
import FoundationsCrossLinkChip from './FoundationsCrossLinkChip';

const PARTITIONING_LABELS: Record<ArchitectureStyle['partitioning'], string> = {
  technical: 'Technical partitioning',
  domain: 'Domain partitioning',
};

const STYLE_CHAPTER_RANGE = `Ch. ${Math.min(...ARCHITECTURE_STYLES.map((style) => style.chapter))}–${Math.max(
  ...ARCHITECTURE_STYLES.map((style) => style.chapter),
)}`;

/**
 * Richards & Ford, scoped to what the page doesn't already own: the laws,
 * the identify → measure → scope → govern lifecycle of a characteristic
 * (the characteristics themselves live in Core Characteristics), and the
 * architecture styles (the building blocks live in Components).
 */
const FoundationsSoftwareArchitecture = () => (
  <div id="foundations-software-architecture" className="scroll-mt-24 mt-14">
    <FoundationsSubsectionHeading
      eyebrow="2 · Software architecture"
      title="Trade-offs, not best practices"
      intro="Core Characteristics names the qualities a system can have; this is how an architect decides which ones matter, proves the system has them, and picks a shape that can deliver them."
      referenceId="software-architecture-fundamentals-richards-ford"
    />

    <div className="grid gap-3 sm:grid-cols-2 mb-6">
      {ARCHITECTURE_LAWS.map((law) => (
        <div key={law.id} className="card-base p-4 border-l-4 border-l-blue-500">
          <p className="flex items-start gap-2 text-sm font-bold text-zinc-900 dark:text-white">
            <Scale size={15} className="mt-0.5 shrink-0 stroke-[2.5] text-blue-600 dark:text-blue-400" aria-hidden="true" />
            {law.statement}
          </p>
          <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{law.implication}</p>
        </div>
      ))}
    </div>

    <p className="text-micro text-zinc-400 mb-2">From characteristic to governed system</p>
    <ol className="space-y-3 mb-8">
      {ARCHITECTURE_CONCEPTS.map((concept, index) => (
        <li key={concept.id}>
          <FoundationsAccordion
            title={
              <>
                <span className="text-zinc-300 dark:text-zinc-700 mr-2">{index + 1}</span>
                {concept.label}
              </>
            }
            summary={concept.summary}
          >
            <p>{concept.detail}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {concept.crossLink && <FoundationsCrossLinkChip {...concept.crossLink} />}
              <span className="text-micro text-zinc-400">Ch. {concept.chapters.join(', ')}</span>
            </div>
          </FoundationsAccordion>
        </li>
      ))}
    </ol>

    <FoundationsAccordion
      title={`${ARCHITECTURE_STYLES.length} architecture styles, and when to reach for each`}
      summary="Every style is a pre-packaged set of trade-offs — pick the one whose strengths match the characteristics you identified."
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {ARCHITECTURE_STYLES.map((style) => (
          <div key={style.id} className="rounded-lg border border-zinc-100 dark:border-zinc-800 p-3">
            <p className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm font-semibold text-zinc-900 dark:text-white">
              {style.label}
              <span className="text-micro font-normal text-zinc-400">
                {PARTITIONING_LABELS[style.partitioning]} · Ch. {style.chapter}
              </span>
            </p>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">Reach for it when:</span>{' '}
              {style.reachForItWhen}
            </p>
            <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              <span className="font-semibold text-amber-700 dark:text-amber-400">Watch out for:</span> {style.watchOutFor}
            </p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <FoundationsCrossLinkChip label="Building blocks: Components →" href="#components-of-system-design" />
        <span className="text-micro text-zinc-400">{STYLE_CHAPTER_RANGE}</span>
      </div>
    </FoundationsAccordion>
  </div>
);

export default FoundationsSoftwareArchitecture;
