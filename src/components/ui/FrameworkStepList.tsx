import React from 'react';

export interface FrameworkStep {
  id: string;
  marker: string;
  label: string;
  description: string;
  detail?: string[];
  /** Optional time-budget badge (e.g. "~5 min") rendered next to the label.
   *  Omit entirely on pages that don't need timing (Behavioural, Effective
   *  Communication) — purely additive, no other consumer is affected. */
  durationLabel?: string;
}

interface FrameworkStepListProps {
  steps: FrameworkStep[];
}

/**
 * Generic ordered-step timeline — the shared shape behind the STAR method
 * (Behavioural), the stakeholder conversation-navigation sequence (Effective
 * Communication), and the 4-step system-design interview framework (System
 * Design). Built on the existing `.step-divider`/`.step-circle` CSS pattern
 * rather than inventing new timeline styling.
 */
const FrameworkStepList = ({ steps }: FrameworkStepListProps) => (
  <ol className="space-y-6">
    {steps.map((step) => (
      <li key={step.id} id={step.id} className="step-divider pb-1 scroll-mt-24">
        <span className="step-circle">{step.marker}</span>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{step.label}</h3>
          {step.durationLabel && (
            <span className="px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-500 dark:text-zinc-500">
              {step.durationLabel}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {step.description}
        </p>
        {step.detail && step.detail.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {step.detail.map((line) => (
              <li
                key={line}
                className="text-sm text-zinc-500 dark:text-zinc-500 leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700"
              >
                {line}
              </li>
            ))}
          </ul>
        )}
      </li>
    ))}
  </ol>
);

export default FrameworkStepList;
