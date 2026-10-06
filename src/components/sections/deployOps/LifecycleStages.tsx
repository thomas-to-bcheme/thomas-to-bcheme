import Link from 'next/link';

import { DEPLOYOPS_LEVELS } from '@/constants/deployOps/levels';
import type {
  FirstPrinciplesTopic,
  LevelId,
  LifecycleStage,
} from '@/constants/deployOps/types';
import { BODY_TEXT_CLASS, FOCUS_RING } from '@/components/sections/sweDe/styles';

interface LifecycleStagesProps {
  stages: LifecycleStage[];
  /** Every specialization topic, so each stage can link into both pages. */
  topicsByLevel: Record<LevelId, FirstPrinciplesTopic[]>;
}

const LABEL_CLASS = 'text-micro font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400';

/**
 * The nine stages from first principles. Each card states the problem the
 * stage solves and the invariant it protects, then links to the topics that
 * specialize it in DevOps and in AI/LLM/MLOps.
 */
const LifecycleStages = ({ stages, topicsByLevel }: LifecycleStagesProps) => (
  <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {stages.map((stage) => (
      <li key={stage.id} id={`stage-${stage.id}`} className="card-base p-5 scroll-mt-28 space-y-3">
        <header className="flex items-baseline gap-2">
          <span className="text-micro font-bold text-zinc-400">{stage.stepNumber}</span>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">{stage.label}</h3>
        </header>
        <div>
          <p className={LABEL_CLASS}>Problem it solves</p>
          <p className={`mt-1 ${BODY_TEXT_CLASS}`}>{stage.problem}</p>
        </div>
        <div>
          <p className={LABEL_CLASS}>Invariant it protects</p>
          <p className={`mt-1 ${BODY_TEXT_CLASS}`}>{stage.invariant}</p>
        </div>
        <div className="space-y-1 border-t border-zinc-100 dark:border-zinc-900 pt-3">
          {DEPLOYOPS_LEVELS.map((level) => {
            const topics = topicsByLevel[level.id].filter((topic) => topic.stageIds.includes(stage.id));
            if (topics.length === 0) return null;
            return (
              <p key={level.id} className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">{`${level.navLabel}: `}</span>
                {topics.map((topic, position) => (
                  <span key={topic.id}>
                    {position > 0 && ', '}
                    <Link
                      href={`${level.href}#${topic.id}`}
                      className={`text-blue-700 dark:text-blue-400 hover:underline rounded-sm ${FOCUS_RING}`}
                    >
                      {topic.navLabel}
                    </Link>
                  </span>
                ))}
              </p>
            );
          })}
        </div>
      </li>
    ))}
  </ol>
);

export default LifecycleStages;
