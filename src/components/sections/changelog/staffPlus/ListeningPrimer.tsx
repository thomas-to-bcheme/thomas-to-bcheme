import React from 'react';
import { Ear, MessagesSquare } from 'lucide-react';

import {
  AUDIENCE_ADAPTATION_NOTE,
  LISTENING_SKILLS,
  PLAYBOOK_FRAMEWORKS,
  STAKEHOLDER_INTAKE_QUESTIONS,
} from '@/constants/staffPlus';
import QuestionList, { QuestionKindBadge } from './QuestionList';

/**
 * Shared primer that opens the Senior-to-Staff+ section: the four conversation
 * moves (reflective and active listening, probing and deeper questions), the
 * stakeholder intake questions, and the playbook templates the topic cards
 * lean on. Server component — static data only.
 */
const ListeningPrimer: React.FC = () => (
  <div className="space-y-6">
    <div className="card-base p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <Ear size={18} className="text-blue-500" aria-hidden="true" />
        <h3 className="font-bold text-zinc-900 dark:text-white">Ask the right question: four conversation moves</h3>
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-5">
        Reflective and active listening confirm you understood. Probing questions then narrow to specifics, and deeper
        questions widen to assumptions and consequences. Probing gets you the fact; deeper gets you the reason it matters.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {LISTENING_SKILLS.map((skill) => (
          <div
            key={skill.kind}
            className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 p-4"
          >
            <div className="mb-2 flex items-center gap-2">
              <QuestionKindBadge kind={skill.kind} />
              <span className="text-sm font-bold text-zinc-900 dark:text-white">{skill.label}</span>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-2">{skill.definition}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-2">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">Use when: </span>
              {skill.useWhen}
            </p>
            <ul className="space-y-1 mb-2">
              {skill.examplePhrases.map((phrase) => (
                <li key={phrase} className="text-sm italic text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  &ldquo;{phrase}&rdquo;
                </li>
              ))}
            </ul>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">Watch for: </span>
              {skill.pitfall}
            </p>
          </div>
        ))}
      </div>
    </div>

    <div id="stakeholder-intake" className="card-base scroll-mt-24 p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <MessagesSquare size={18} className="text-emerald-500" aria-hidden="true" />
        <h3 className="font-bold text-zinc-900 dark:text-white">Core questions for gathering stakeholder requirements</h3>
      </div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-5">
        Asked before designing an enterprise data pipeline, these align the technical architecture with the business
        operation it serves. Each answer constrains the next.
      </p>
      <ol className="space-y-5">
        {STAKEHOLDER_INTAKE_QUESTIONS.map((item, index) => (
          <li key={item.id} className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              {index + 1}
            </span>
            <div className="min-w-0 space-y-2">
              <p className="font-semibold text-zinc-900 dark:text-white">{item.question}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">Identify: </span>
                {item.identify}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">It determines: </span>
                {item.determines}
              </p>
              <QuestionList questions={item.followUps} />
            </div>
          </li>
        ))}
      </ol>
    </div>

    <div className="card-base p-5 sm:p-6">
      <h3 className="font-bold text-zinc-900 dark:text-white mb-1">Communication templates</h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
        From the &ldquo;From Doer to Strategic Leader&rdquo; playbook. Fill the brackets; keep the order.
      </p>
      <dl className="grid gap-3 md:grid-cols-2">
        {PLAYBOOK_FRAMEWORKS.map((framework) => (
          <div
            key={framework.id}
            className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 p-4"
          >
            <dt className="text-sm font-bold text-zinc-900 dark:text-white">{framework.name}</dt>
            <dd className="mt-1 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{framework.template}</dd>
            <dd className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              <span className="font-semibold">Use when: </span>
              {framework.useWhen}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{AUDIENCE_ADAPTATION_NOTE}</p>
    </div>
  </div>
);

export default ListeningPrimer;
