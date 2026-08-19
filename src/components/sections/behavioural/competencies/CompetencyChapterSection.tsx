import React from 'react';
import SectionHeading from '@/components/ui/SectionHeading';
import Badge from '@/components/ui/Badge';
import CompetencySampleQuestionCard from './CompetencySampleQuestionCard';
import type { CompetencyChapter } from '@/constants/behavioural/competencies/types';

interface CompetencyChapterSectionProps {
  chapter: CompetencyChapter;
}

const LIST_ITEM_CLASS =
  "text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700";

/**
 * Formats a ByteByteGo chapter number (5–13 for this page's 9 competency
 * chapters) as a zero-padded two-digit tag — "Ch. 05" through "Ch. 09", then
 * "Ch. 10" through "Ch. 13" unpadded — rather than hardcoding a leading zero
 * for every chapter.
 */
const formatChapterNumber = (chapterNumber: number): string =>
  chapterNumber < 10 ? `0${chapterNumber}` : `${chapterNumber}`;

/**
 * Renders one full Part-II competency chapter — the top-level unit repeated
 * 9x on the behavioural page (Taking Initiative through Strategic Leadership
 * and Thinking Big). Composes SectionHeading, the chapter's own prose/
 * callouts, and a list of CompetencySampleQuestionCard accordions, following
 * the same card/list idioms already established by BehaviouralCategoryCard
 * and SeniorVsStaffSection.
 */
const CompetencyChapterSection = ({ chapter }: CompetencyChapterSectionProps) => (
  <section id={chapter.id} className="scroll-mt-24 mb-16">
    <SectionHeading eyebrow={`Ch. ${formatChapterNumber(chapter.chapterNumber)}`} title={chapter.title} />

    <p className="text-sm italic text-zinc-500 dark:text-zinc-400 leading-relaxed mb-3">
      {chapter.openingHook}
    </p>
    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
      {chapter.definition}{' '}
      <a
        href={chapter.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
      >
        Read the ByteByteGo chapter
      </a>
    </p>

    {chapter.keyDistinction && (
      <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 p-3 mb-4">
        <span className="text-sm font-bold text-zinc-900 dark:text-white block mb-1">
          {chapter.keyDistinction.label}
        </span>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {chapter.keyDistinction.explanation}
        </p>
      </div>
    )}

    <div className="mb-4">
      <span className="text-micro text-zinc-400 mb-1.5 block">The Tension</span>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{chapter.centralTension}</p>
    </div>

    {chapter.namedCompanyValues && chapter.namedCompanyValues.length > 0 && (
      <div className="flex flex-wrap gap-2 mb-4">
        {chapter.namedCompanyValues.map((entry) => (
          <Badge key={`${entry.company}-${entry.value}`} color="zinc" variant="outline">
            {entry.company} &mdash; &ldquo;{entry.value}&rdquo;
          </Badge>
        ))}
      </div>
    )}

    <div className="mb-8">
      <span className="text-micro text-zinc-400 mb-1.5 block">Across Company Types</span>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{chapter.culturalConsiderations}</p>
    </div>

    <div className="mb-8">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">Question Categories</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {chapter.questionCategories.map((category) => (
          <div
            key={category.id}
            className="rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 p-3"
          >
            <span className="text-sm font-bold text-zinc-900 dark:text-white block mb-1">{category.label}</span>
            <p className="text-sm italic text-zinc-500 dark:text-zinc-400 leading-relaxed">
              &ldquo;{category.exampleQuestion}&rdquo;
            </p>
          </div>
        ))}
      </div>
    </div>

    <div className="mb-8">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">Sample Questions</h3>
      <div className="space-y-3">
        {chapter.sampleQuestions.map((question) => (
          <CompetencySampleQuestionCard key={question.id} question={question} />
        ))}
      </div>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 mb-8">
      <div className="card-base p-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">Key Signals</h3>
        <ul className="space-y-1.5">
          {chapter.keySignals.map((signal) => (
            <li key={signal} className={LIST_ITEM_CLASS}>
              {signal}
            </li>
          ))}
        </ul>
      </div>

      <div className="card-base p-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">Red Flags</h3>
        <ul className="space-y-1.5">
          {chapter.redFlags.map((flag) => (
            <li key={flag} className={LIST_ITEM_CLASS}>
              {flag}
            </li>
          ))}
        </ul>
      </div>
    </div>

    <div className="card-base p-4 mb-8">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">If Nothing Comes to Mind</h3>
      <ul className="space-y-1.5">
        {chapter.reflectionQuestions.map((question) => (
          <li key={question} className={LIST_ITEM_CLASS}>
            {question}
          </li>
        ))}
      </ul>
    </div>

    <div className="grid gap-4 sm:grid-cols-2">
      <div className="card-base p-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">Strong Stories Include</h3>
        <ul className="space-y-1.5">
          {chapter.keyTakeaways.strongStoriesInclude.map((item) => (
            <li key={item} className={LIST_ITEM_CLASS}>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="card-base p-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">Avoid These Traps</h3>
        <ul className="space-y-1.5">
          {chapter.keyTakeaways.avoidTheseTraps.map((item) => (
            <li key={item} className={LIST_ITEM_CLASS}>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>

    {chapter.relatedCompetencies.length > 0 && (
      <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-500">
        Related: {chapter.relatedCompetencies.map((related) => related.relationship).join(' ')}
      </p>
    )}
  </section>
);

export default CompetencyChapterSection;
