import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { EssentialQuestion } from '@/constants/behavioural/essentialQuestions';

interface EssentialQuestionCardProps {
  question: EssentialQuestion;
}

const BULLET_CLASS =
  "text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700";

/**
 * <details>/<summary> accordion for one ESSENTIAL_QUESTIONS entry — same idiom as
 * BehaviouralCategoryCard. Summary surfaces the question's title and its actual
 * interview prompt; the body expands into the "what this tests" lead paragraph
 * followed by the question's own subsections, each rendered as a labeled bullet
 * list rather than the shared STAR grid, since every question here has a
 * different internal shape.
 */
const EssentialQuestionCard = ({ question }: EssentialQuestionCardProps) => (
  <details className="group card-base p-0 overflow-hidden">
    <summary className="flex items-start justify-between gap-4 p-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
      <div className="min-w-0">
        <span className="block text-sm font-semibold text-zinc-900 dark:text-white">
          {question.title}
        </span>
        <span className="mt-1 block text-sm italic text-zinc-500 dark:text-zinc-400 leading-relaxed">
          &ldquo;{question.prompt}&rdquo;
        </span>
      </div>
      <ChevronDown className="w-4 h-4 shrink-0 mt-0.5 text-zinc-400 transition-transform duration-200 group-open:rotate-180" />
    </summary>
    <div className="px-4 pb-4 space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{question.tests}</p>
      {question.sections.map((section) => (
        <div key={section.heading}>
          <span className="text-micro text-zinc-400 mb-1.5 block">{section.heading}</span>
          <ul className="space-y-1.5">
            {section.items.map((item) => (
              <li key={item} className={BULLET_CLASS}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </details>
);

export default EssentialQuestionCard;
