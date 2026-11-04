import React from 'react';

import { COMPETENCY_STORIES } from '@/data/credentials';
import type { StaffPlusTopic } from '@/constants/staffPlus/types';
import QuestionList from './QuestionList';
import { LINK_CLASS } from './styles';

const storyById = new Map(COMPETENCY_STORIES.map((story) => [story.id, story]));

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="text-micro text-zinc-400 mb-2 block">{children}</span>
);

const BulletList = ({ items }: { items: string[] }) => (
  <ul className="space-y-1.5">
    {items.map((item) => (
      <li
        key={item}
        className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700"
      >
        {item}
      </li>
    ))}
  </ul>
);

/** One senior-to-staff+ competency: the shift, the advice, the standards, the business lens, and the questions to ask. */
const StaffPlusTopicCard: React.FC<{ topic: StaffPlusTopic }> = ({ topic }) => {
  const relatedStories = topic.relatedStoryIds.flatMap((id) => {
    const story = storyById.get(id);
    return story ? [story] : [];
  });

  return (
    <article id={topic.id} className="card-base scroll-mt-24 p-5 sm:p-6 space-y-5">
      <header>
        <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">{topic.title}</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{topic.summary}</p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 p-4">
          <SectionLabel>Senior</SectionLabel>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{topic.seniorToStaffShift.senior}</p>
        </div>
        <div className="rounded-xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10 p-4">
          <SectionLabel>Staff+</SectionLabel>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{topic.seniorToStaffShift.staff}</p>
        </div>
      </div>

      <div>
        <SectionLabel>Insight</SectionLabel>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{topic.insight}</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <SectionLabel>Best practices</SectionLabel>
          <BulletList items={topic.bestPractices} />
        </div>
        <div>
          <SectionLabel>Industry standards</SectionLabel>
          <ul className="space-y-2">
            {topic.industryStandards.map((standard) => (
              <li key={standard.name} className="text-sm leading-relaxed">
                <span className="font-semibold text-zinc-900 dark:text-white">{standard.name}. </span>
                <span className="text-zinc-600 dark:text-zinc-400">{standard.description}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <SectionLabel>The business lens</SectionLabel>
        <dl className="grid gap-3 md:grid-cols-3">
          {(
            [
              ['Risk', topic.businessLens.risk],
              ['Organizational spend', topic.businessLens.spend],
              ['Financial alignment', topic.businessLens.financialAlignment],
            ] as const
          ).map(([label, text]) => (
            <div
              key={label}
              className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 p-3"
            >
              <dt className="text-xs font-bold text-zinc-900 dark:text-white">{label}</dt>
              <dd className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{text}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div>
        <SectionLabel>Questions to ask</SectionLabel>
        <QuestionList questions={topic.coreQuestions} />
      </div>

      {relatedStories.length > 0 && (
        <footer className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-micro text-zinc-400">Evidence</span>
          {relatedStories.map((story) => (
            <a key={story.id} href={`#story-${story.id}`} className={LINK_CLASS}>
              {story.competency} →
            </a>
          ))}
        </footer>
      )}
    </article>
  );
};

export default StaffPlusTopicCard;
