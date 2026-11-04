import React from 'react';

import type { CoreQuestion, QuestionKind } from '@/constants/staffPlus/types';
import { QUESTION_KIND_BADGE, QUESTION_KIND_LABEL } from './styles';

interface QuestionListProps {
  questions: Array<Pick<CoreQuestion, 'kind' | 'question'> & { whyItWorks?: string }>;
}

export const QuestionKindBadge = ({ kind }: { kind: QuestionKind }) => (
  <span
    className={`shrink-0 rounded-full border px-2 py-0.5 text-micro ${QUESTION_KIND_BADGE[kind]}`}
  >
    {QUESTION_KIND_LABEL[kind]}
  </span>
);

/** A labelled list of questions the reader can ask, each tagged with its conversation move. */
const QuestionList: React.FC<QuestionListProps> = ({ questions }) => (
  <ul className="space-y-3">
    {questions.map((item) => (
      <li key={`${item.kind}-${item.question}`} className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
        <QuestionKindBadge kind={item.kind} />
        <div className="min-w-0">
          <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">&ldquo;{item.question}&rdquo;</p>
          {item.whyItWorks && (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{item.whyItWorks}</p>
          )}
        </div>
      </li>
    ))}
  </ul>
);

export default QuestionList;
