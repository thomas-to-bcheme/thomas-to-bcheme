import React from 'react';
import type { InterviewPhaseTopic } from '@/constants/behavioural/nailingTheInterview';

const BULLET_CLASS =
  "text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700";

interface InterviewPhaseTopicCardProps {
  topic: InterviewPhaseTopic;
}

/**
 * Shared static card for a single Ch.14 topic, reused across
 * BeforeInterviewSection, DuringInterviewSection, and AfterInterviewSection
 * — same idiom as FitFramingSection/ResearchChecklistSection's cards: no
 * accordion, just a scannable heading + summary + optional bullet list.
 */
const InterviewPhaseTopicCard = ({ topic }: InterviewPhaseTopicCardProps) => (
  <div className="card-base p-5 sm:p-6">
    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{topic.heading}</h3>
    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{topic.body}</p>
    {topic.items && topic.items.length > 0 && (
      <ul className="mt-3 space-y-1.5">
        {topic.items.map((item) => (
          <li key={item} className={BULLET_CLASS}>
            {item}
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default InterviewPhaseTopicCard;
