import React from 'react';
import { COMPANY_RESEARCH_TACTICS } from '@/constants/behavioural';

const BULLET_CLASS =
  "text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700";

/**
 * Grid of COMPANY_RESEARCH_TACTICS — concrete pre-interview tactics for sensing which
 * side of each MisFitAxesSection axis a company actually sits on. Same card idiom as
 * FitFramingSection.
 */
const ResearchChecklistSection = () => (
  <div className="grid gap-4 sm:grid-cols-2">
    {COMPANY_RESEARCH_TACTICS.map((tactic) => (
      <div key={tactic.id} className="card-base p-5 sm:p-6">
        <h3 className="text-base font-bold text-zinc-900 dark:text-white">{tactic.source}</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{tactic.approach}</p>
        <span className="text-micro text-zinc-400 block mt-4 mb-2">Ask</span>
        <ul className="space-y-1.5">
          {tactic.questionsToAsk.map((question) => (
            <li key={question} className={BULLET_CLASS}>
              {question}
            </li>
          ))}
        </ul>
      </div>
    ))}
  </div>
);

export default ResearchChecklistSection;
