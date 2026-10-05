import { READING_STAGE_KIND_LABELS, type ReadingStage } from '@/constants/sweDe';
import BookSequence from './BookSequence';

interface ReadingPathStagesProps {
  stages: ReadingStage[];
}

/** Numbered reading stages: books in order, then what you can explain afterwards. */
const ReadingPathStages = ({ stages }: ReadingPathStagesProps) => (
  <ol className="space-y-3">
    {stages.map((stage) => (
      <li key={stage.id} id={`stage-${stage.id}`} className="card-base p-4 sm:p-5 flex gap-4 scroll-mt-28">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-xs font-bold text-blue-700 dark:text-blue-400">
          {stage.stepNumber}
        </span>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{stage.label}</h3>
            <span className="tag-blue">{READING_STAGE_KIND_LABELS[stage.kind]}</span>
          </div>
          <BookSequence bookIds={stage.bookIds} />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            <span className="font-semibold">You can now explain:</span> {stage.outcome}
          </p>
        </div>
      </li>
    ))}
  </ol>
);

export default ReadingPathStages;
