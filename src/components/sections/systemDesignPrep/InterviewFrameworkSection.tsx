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

const DURATION_PILL_CLASS =
  'px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-500 dark:text-zinc-500';

// Illustrative split for a typical 45-minute interview — Intro/Scope/Wrap-up/
// Q&A hold at a fixed ~5 min regardless of total length; High-Level Design
// and Deep Dive absorb whatever's left, split evenly (e.g. ~20/~20 in a
// 60-minute round). The rule is the fixed-4-plus-even-split, not the 45.
const TIMING_SEGMENTS: { id: string; label: string; minutes: number; isBookend: boolean }[] = [
  { id: 'intro', label: 'Intro', minutes: 5, isBookend: true },
  { id: 'scope', label: 'Scope', minutes: 5, isBookend: false },
  { id: 'hld', label: 'High-Level Design', minutes: 12, isBookend: false },
  { id: 'deep-dive', label: 'Deep Dive', minutes: 13, isBookend: false },
  { id: 'wrap-up', label: 'Wrap-up', minutes: 5, isBookend: false },
  { id: 'qa', label: 'Q&A', minutes: 5, isBookend: true },
];
const TIMING_TOTAL_MINUTES = TIMING_SEGMENTS.reduce((sum, segment) => sum + segment.minutes, 0);

/**
 * The 4-step interview framework — the tool the question bank
 * (SystemDesignQuestionsSection) fills in the substance of, during steps 2
 * and 3. Bookended by an Intro and Q&A (not renumbered as steps 0/5 — the
 * "4-step" identity stays put) so the full session's time budget is visible
 * end to end.
 */
const InterviewFrameworkSection = () => (
  <section id="interview-framework" className="scroll-mt-24 mt-16">
    <SectionHeading eyebrow="The Framework" title="A repeatable 4-step approach" />
    <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
      This is the tool you reach for during steps 2 and 3 below — the question bank in{' '}
      <a href="#design" className="font-semibold text-blue-700 dark:text-blue-400 hover:underline">
        &quot;Ask the right question before picking an answer&quot;
      </a>{' '}
      is what fills in the substance of the High-Level Design and Deep Dive steps.
    </p>

    <div className="mb-8">
      <div className="flex h-3 w-full overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-800">
        {TIMING_SEGMENTS.map((segment) => (
          <div
            key={segment.id}
            title={`${segment.label} — ~${segment.minutes} min`}
            style={{ width: `${(segment.minutes / TIMING_TOTAL_MINUTES) * 100}%` }}
            className={`h-full border-r border-white dark:border-black last:border-r-0 ${
              segment.isBookend ? 'bg-zinc-300 dark:bg-zinc-700' : 'bg-blue-500/70 dark:bg-blue-500/60'
            }`}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {TIMING_SEGMENTS.map((segment) => (
          <span key={segment.id} className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-500">
            <span
              className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                segment.isBookend ? 'bg-zinc-300 dark:bg-zinc-700' : 'bg-blue-500/70 dark:bg-blue-500/60'
              }`}
            />
            {segment.label} <span className="font-semibold text-zinc-600 dark:text-zinc-400">~{segment.minutes} min</span>
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-600 leading-relaxed max-w-2xl">
        Worked for a typical 45-minute interview. Scope and Wrap-up hold at ~5 min regardless of length;
        High-Level Design and Deep Dive just split whatever time remains, evenly.
      </p>
    </div>

    <div className="card-base p-4 mb-4">
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-white mb-1">
        Intro <span className={DURATION_PILL_CLASS}>~5 min</span>
      </h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        Restate the problem in your own words, propose a rough agenda (&quot;I&apos;ll spend a few minutes on
        scope, sketch the high-level design, then go deep on the part that matters most&quot;), and confirm
        scope out loud — before the clock starts on the framework below.
      </p>
    </div>

    <FrameworkStepList steps={INTERVIEW_FRAMEWORK_STEPS} />

    <div className="card-base p-4 mt-4">
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-white mb-1">
        Q&amp;A <span className={DURATION_PILL_CLASS}>~5 min</span>
      </h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        Treat this as more interview, not wind-down — the same &quot;what if&quot; follow-ups from Wrap Up
        often continue here. Ask something that shows genuine interest: the team&apos;s actual biggest
        pain point, or what a follow-up round would probe. Don&apos;t leave it blank — it&apos;s still a signal.
      </p>
    </div>

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
