import { SOFTWARE_ENGINEERING_FUNDAMENTALS } from '@/constants/systemDesignPrep/foundations';
import { SWE_COMPASS_LIFECYCLE_STAGES } from '@/constants/systemDesignPrep/sweCompassLifecycle';
import FoundationsSubsectionHeading from './FoundationsSubsectionHeading';
import FoundationsAccordion from './FoundationsAccordion';
import FoundationsCrossLinkChip from './FoundationsCrossLinkChip';

const formatChapters = (chapters: number[]) =>
  chapters.length === 0 ? "From the book's stated themes" : `Ch. ${chapters.join(', ')}`;

/**
 * Schutta & Vega's software-engineering fundamentals, one closed accordion
 * each. `appliesTo` tags link straight to the matching question-bank
 * category — those categories' ids are the SWE Compass stage ids.
 */
const FoundationsSoftwareEngineering = () => (
  <div id="foundations-software-engineering" className="scroll-mt-24 mt-10">
    <FoundationsSubsectionHeading
      eyebrow="1 · Software engineering"
      title="From coder to engineer"
      intro="The habits that separate shipping code from engineering a system — each one shows up in a design interview as a question you should be asking, or a signal you should be giving."
      referenceId="swe-fundamentals-schutta-vega"
    />
    <div className="grid gap-3 md:grid-cols-2">
      {SOFTWARE_ENGINEERING_FUNDAMENTALS.map((fundamental) => (
        <FoundationsAccordion key={fundamental.id} title={fundamental.label} summary={fundamental.summary}>
          <p>{fundamental.detail}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {fundamental.appliesTo.map((stageId) => {
              const stage = SWE_COMPASS_LIFECYCLE_STAGES.find((candidate) => candidate.id === stageId);
              if (!stage) return null;
              return <FoundationsCrossLinkChip key={stageId} label={`${stage.label} questions →`} href={`#${stage.id}`} />;
            })}
            {fundamental.crossLink && <FoundationsCrossLinkChip {...fundamental.crossLink} />}
          </div>
          <p className="text-micro text-zinc-400">{formatChapters(fundamental.chapters)}</p>
        </FoundationsAccordion>
      ))}
    </div>
  </div>
);

export default FoundationsSoftwareEngineering;
