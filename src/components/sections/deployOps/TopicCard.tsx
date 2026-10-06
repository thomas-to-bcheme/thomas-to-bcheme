import Link from 'next/link';

import { DEPLOYOPS_BASE_PATH } from '@/constants/deployOps/levels';
import { LIFECYCLE_STAGES } from '@/constants/deployOps/lifecycle';
import type { FirstPrinciplesTopic } from '@/constants/deployOps/types';
import ComparisonTable from '@/components/sections/sweDe/ComparisonTable';
import { BODY_TEXT_CLASS, FOCUS_RING } from '@/components/sections/sweDe/styles';
import BookLink from './BookLink';

const LABEL_CLASS = 'text-micro font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400';
const STAGE_LABELS = new Map(LIFECYCLE_STAGES.map((stage) => [stage.id, stage.label]));

interface TopicCardProps {
  topic: FirstPrinciplesTopic;
}

/**
 * One topic argued in what / why / how order. Stage chips link back to the
 * overview stage the topic specializes, so each specialization visibly reuses
 * the shared lifecycle.
 */
const TopicCard = ({ topic }: TopicCardProps) => (
  <article id={topic.id} className="card-base p-5 sm:p-6 scroll-mt-28 space-y-4">
    <header>
      <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">{topic.title}</h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{topic.summary}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-micro font-bold uppercase tracking-wider text-zinc-400">Lifecycle</span>
        {topic.stageIds.map((stageId) => (
          <Link
            key={stageId}
            href={`${DEPLOYOPS_BASE_PATH}#stage-${stageId}`}
            className={`tag-blue rounded-sm ${FOCUS_RING}`}
          >
            {STAGE_LABELS.get(stageId) ?? stageId}
          </Link>
        ))}
      </div>
    </header>

    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div>
        <p className={LABEL_CLASS}>What is it?</p>
        <p className={`mt-1 ${BODY_TEXT_CLASS}`}>{topic.what}</p>
      </div>
      <div>
        <p className={LABEL_CLASS}>Why does it exist?</p>
        <p className={`mt-1 ${BODY_TEXT_CLASS}`}>{topic.why}</p>
      </div>
    </div>

    <div>
      <p className={LABEL_CLASS}>How does it work?</p>
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

    {topic.breaksWhere && (
      <p className={`${BODY_TEXT_CLASS} rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 p-3`}>
        <span className="font-semibold text-rose-700 dark:text-rose-400">Where it stops holding: </span>
        {topic.breaksWhere}
      </p>
    )}

    {topic.comparison && <ComparisonTable table={topic.comparison} />}

    {topic.tools && topic.tools.length > 0 && (
      <div className="flex flex-wrap gap-1.5" aria-label="Representative technologies">
        {topic.tools.map((tool) => (
          <span key={tool} className="tag-blue">
            {tool}
          </span>
        ))}
      </div>
    )}

    <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
      <span className="text-micro font-bold uppercase tracking-wider text-zinc-400">Read</span>
      {topic.sourceBookIds.map((bookId) => (
        <BookLink key={bookId} bookId={bookId} className="text-xs" />
      ))}
    </footer>
  </article>
);

export default TopicCard;
