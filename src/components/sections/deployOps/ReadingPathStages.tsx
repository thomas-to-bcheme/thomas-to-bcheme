import { Fragment } from 'react';
import { ArrowRight } from 'lucide-react';

import type { BookId, ReadingStage, ReadingStageKind } from '@/constants/deployOps/types';
import { BODY_TEXT_CLASS } from '@/components/sections/sweDe/styles';
import BookLink from './BookLink';

const KIND_LABEL: Record<ReadingStageKind, string> = {
  foundations: 'Shared foundation',
  devops: 'DevOps',
  'ai-llm-mlops': 'AI / LLM / MLOps',
  consolidation: 'Consolidation',
};

/** Books in reading order, separated by arrows. */
export const BookSequence = ({ bookIds }: { bookIds: BookId[] }) => (
  <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
    {bookIds.map((bookId, position) => (
      <Fragment key={bookId}>
        {position > 0 && <ArrowRight size={13} className="text-zinc-400 shrink-0" aria-hidden />}
        <BookLink bookId={bookId} />
      </Fragment>
    ))}
  </p>
);

interface ReadingPathStagesProps {
  stages: ReadingStage[];
}

/** The staged path: each stage ends on something you can now explain. */
const ReadingPathStages = ({ stages }: ReadingPathStagesProps) => (
  <ol className="space-y-3">
    {stages.map((stage) => (
      <li key={stage.id} className="card-base p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-micro font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            {`Step ${stage.stepNumber}`}
          </span>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{stage.label}</h3>
          <span className="text-micro text-zinc-400">{KIND_LABEL[stage.kind]}</span>
        </div>
        <div className="mt-2">
          <BookSequence bookIds={stage.bookIds} />
        </div>
        <p className={`mt-2 ${BODY_TEXT_CLASS}`}>
          <span className="font-semibold text-zinc-900 dark:text-white">You can now explain: </span>
          {stage.outcome}
        </p>
      </li>
    ))}
  </ol>
);

export default ReadingPathStages;
