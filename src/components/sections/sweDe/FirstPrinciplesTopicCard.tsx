import { FRAMING_DECISION_TREE } from '@/constants/systemDesignPrep/framingDecisionTree';
import type { FirstPrinciplesTopic } from '@/constants/sweDe';
import ComparisonTable from './ComparisonTable';
import BookLink from './BookLink';
import { BODY_TEXT_CLASS } from './styles';

const [WHAT_QUESTION, WHY_QUESTION, HOW_QUESTION] = FRAMING_DECISION_TREE;

const QUESTION_LABEL_CLASS = 'text-micro font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400';

interface FirstPrinciplesTopicCardProps {
  topic: FirstPrinciplesTopic;
}

/**
 * One topic argued in North Star order — the what/why/how labels come from
 * FRAMING_DECISION_TREE so the framing stays in one place.
 */
const FirstPrinciplesTopicCard = ({ topic }: FirstPrinciplesTopicCardProps) => (
  <article id={topic.id} className="card-base p-5 sm:p-6 scroll-mt-28 space-y-4">
    <header>
      <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">{topic.title}</h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{topic.summary}</p>
    </header>

    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div>
        <p className={QUESTION_LABEL_CLASS}>{WHAT_QUESTION.question}</p>
        <p className={`mt-1 ${BODY_TEXT_CLASS}`}>{topic.what}</p>
      </div>
      <div>
        <p className={QUESTION_LABEL_CLASS}>{WHY_QUESTION.question}</p>
        <p className={`mt-1 ${BODY_TEXT_CLASS}`}>{topic.why}</p>
      </div>
    </div>

    <div>
      <p className={QUESTION_LABEL_CLASS}>{HOW_QUESTION.question}</p>
      <ul className="mt-1 space-y-1.5">
        {topic.how.map((step) => (
          <li
            key={step}
            className={`${BODY_TEXT_CLASS} pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700`}
          >
            {step}
          </li>
        ))}
      </ul>
    </div>

    {topic.comparison && <ComparisonTable table={topic.comparison} />}

    <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
      <span className="text-micro font-bold uppercase tracking-wider text-zinc-400">Read</span>
      {topic.sourceBookIds.map((bookId) => (
        <BookLink key={bookId} bookId={bookId} className="text-xs" />
      ))}
    </footer>
  </article>
);

export default FirstPrinciplesTopicCard;
