import { Check, X } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';
import FrameworkStepList from '@/components/ui/FrameworkStepList';
import {
  INTERVIEW_FRAMEWORK_STEPS,
  INTERVIEW_DOS,
  INTERVIEW_DONTS,
} from '@/constants/systemDesignPrep/interviewFramework';

const LIST_ITEM_CLASS =
  'text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-4 relative before:content-[\'—\'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700';

/**
 * The 4-step interview framework — the tool the question bank
 * (SystemDesignQuestionsSection) fills in the substance of, during steps 2
 * and 3.
 */
const InterviewFrameworkSection = () => (
  <section id="interview-framework" className="scroll-mt-24 mt-16">
    <SectionHeading eyebrow="The Framework" title="A repeatable 4-step approach" />
    <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-8">
      This is the tool you reach for during steps 2 and 3 below — the question bank in{' '}
      <a href="#data-consistency" className="font-semibold text-blue-700 dark:text-blue-400 hover:underline">
        &quot;Ask the right question before picking an answer&quot;
      </a>{' '}
      is what fills in the substance of the High-Level Design and Deep Dive steps.
    </p>

    <FrameworkStepList steps={INTERVIEW_FRAMEWORK_STEPS} />

    <div className="mt-10 grid gap-4 sm:grid-cols-2">
      <div className="card-base p-4">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 mb-3">
          <Check size={15} className="stroke-[2.5]" /> Do
        </h3>
        <ul className="space-y-1.5">
          {INTERVIEW_DOS.map((line) => (
            <li key={line} className={LIST_ITEM_CLASS}>
              {line}
            </li>
          ))}
        </ul>
      </div>
      <div className="card-base p-4">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-red-700 dark:text-red-400 mb-3">
          <X size={15} className="stroke-[2.5]" /> Don&apos;t
        </h3>
        <ul className="space-y-1.5">
          {INTERVIEW_DONTS.map((line) => (
            <li key={line} className={LIST_ITEM_CLASS}>
              {line}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);

export default InterviewFrameworkSection;
