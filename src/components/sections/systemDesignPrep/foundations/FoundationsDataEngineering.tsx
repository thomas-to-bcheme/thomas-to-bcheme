import {
  DE_LIFECYCLE_STAGES,
  DE_UNDERCURRENTS,
  DE_DOWNSTREAM_OUTPUTS,
  DE_LIFECYCLE_CHAPTER_RANGE,
  type FoundationsSubsectionId,
} from '@/constants/systemDesignPrep/foundations';
import FoundationsSubsectionHeading from './FoundationsSubsectionHeading';
import FoundationsAccordion from './FoundationsAccordion';
import FoundationsCrossLinkChip from './FoundationsCrossLinkChip';
import DataEngineeringLifecycleDiagram, {
  deStageAnchor,
  deUndercurrentAnchor,
  deOutputAnchor,
} from './DataEngineeringLifecycleDiagram';

const SUBSECTION_LINK_LABELS: Record<FoundationsSubsectionId, string> = {
  'foundations-software-engineering': 'See also: Software engineering →',
  'foundations-software-architecture': 'See also: Software architecture →',
  'foundations-data-engineering': 'See also: Data lifecycle →',
};

/**
 * Reis & Housley's data engineering lifecycle: the rebuilt figure, then one
 * closed accordion per stage (key questions), the 6 undercurrents, and the 3
 * downstream outputs — every anchor the figure links to lives here.
 */
const FoundationsDataEngineering = () => (
  <div id="foundations-data-engineering" className="scroll-mt-24 mt-14">
    <FoundationsSubsectionHeading
      eyebrow="3 · Data engineering"
      title="The lifecycle data moves through before anyone can trust it"
      intro="Five stages turn data produced somewhere else into something analytics, models, and operational tools can rely on — and six undercurrents apply at every one of them. The Data and Model questions further down assume this lifecycle already exists."
      referenceId="data-eng-lifecycle-fundamentals"
    />

    <DataEngineeringLifecycleDiagram />

    <p className="text-micro text-zinc-400 mt-8 mb-2">
      Stages · Ch. {DE_LIFECYCLE_CHAPTER_RANGE.first}–{DE_LIFECYCLE_CHAPTER_RANGE.last}
    </p>
    <div className="space-y-3">
      {DE_LIFECYCLE_STAGES.map((stage) => (
        <FoundationsAccordion key={stage.id} id={deStageAnchor(stage.id)} title={stage.label} summary={stage.summary}>
          <p>{stage.detail}</p>
          <div>
            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Questions to ask</p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
              {stage.keyQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          </div>
          <p className="text-micro text-zinc-400">Ch. {stage.chapter}</p>
        </FoundationsAccordion>
      ))}
    </div>

    <p className="text-micro text-zinc-400 mt-8 mb-2">Undercurrents — continuous, across every stage</p>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {DE_UNDERCURRENTS.map((undercurrent) => (
        <div key={undercurrent.id} id={deUndercurrentAnchor(undercurrent.id)} className="card-base p-4 scroll-mt-24">
          <p className="text-sm font-bold text-zinc-900 dark:text-white">{undercurrent.label}</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500 leading-relaxed">{undercurrent.summary}</p>
          <ul className="mt-2 list-disc pl-5 space-y-0.5 text-xs text-zinc-600 dark:text-zinc-400">
            {undercurrent.keyPractices.map((practice) => (
              <li key={practice}>{practice}</li>
            ))}
          </ul>
          {undercurrent.relatedSubsectionId && (
            <div className="mt-2">
              <FoundationsCrossLinkChip
                label={SUBSECTION_LINK_LABELS[undercurrent.relatedSubsectionId]}
                href={`#${undercurrent.relatedSubsectionId}`}
              />
            </div>
          )}
        </div>
      ))}
    </div>

    <p className="text-micro text-zinc-400 mt-8 mb-2">Downstream — what Serving feeds</p>
    <div className="grid gap-3 sm:grid-cols-3">
      {DE_DOWNSTREAM_OUTPUTS.map((output) => (
        <div key={output.id} id={deOutputAnchor(output.id)} className="card-base p-4 scroll-mt-24">
          <p className="text-sm font-bold text-zinc-900 dark:text-white">{output.label}</p>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{output.summary}</p>
        </div>
      ))}
    </div>
  </div>
);

export default FoundationsDataEngineering;
