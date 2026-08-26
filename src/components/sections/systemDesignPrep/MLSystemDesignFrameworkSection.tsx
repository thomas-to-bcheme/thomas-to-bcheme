import { Equal, ArrowLeftRight } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';
import FrameworkStepList from '@/components/ui/FrameworkStepList';
import {
  ML_FRAMEWORK_STEPS,
  ML_VS_GENERAL_SIMILARITIES,
  ML_VS_GENERAL_DIFFERENCES,
} from '@/constants/systemDesignPrep/mlSystemDesignFramework';

const LIST_ITEM_CLASS =
  'text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-4 relative before:content-[\'—\'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700';

/**
 * The ML-specific adaptation of the general 4-step Interview Framework
 * above — same FrameworkStepList component, an extra layer of decisions a
 * model in production adds on top of standard system design, not a
 * competing framework. A Similarities/Differences grid (not Do/Don't —
 * neither list is "wrong") closes the section so a reader can place ML
 * system design relative to what they already know.
 */
const MLSystemDesignFrameworkSection = () => (
  <section id="ml-system-design-framework" className="scroll-mt-24 mt-16">
    <SectionHeading eyebrow="The ML-Specific Framework" title="How the framework adapts for a model in production" />
    <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
      An ML system design interview runs on the same instincts as the{' '}
      <a href="#requirements-scope" className="font-semibold text-blue-700 dark:text-blue-400 hover:underline">
        4-step framework above
      </a>{' '}
      — clarify, design, go deep, wrap up — with one extra layer bolted on: a model that has to be trained,
      evaluated, and kept correct after it ships, not just deployed once and left alone.
    </p>

    <FrameworkStepList steps={ML_FRAMEWORK_STEPS} />

    <div className="mt-10 grid gap-4 sm:grid-cols-2">
      <div className="card-base p-4">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-white mb-3">
          <Equal size={15} className="stroke-[2.5]" /> Similarities to General System Design
        </h3>
        <ul className="space-y-1.5">
          {ML_VS_GENERAL_SIMILARITIES.map((line) => (
            <li key={line} className={LIST_ITEM_CLASS}>
              {line}
            </li>
          ))}
        </ul>
      </div>
      <div className="card-base p-4">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-white mb-3">
          <ArrowLeftRight size={15} className="stroke-[2.5]" /> Where It Actually Differs
        </h3>
        <ul className="space-y-1.5">
          {ML_VS_GENERAL_DIFFERENCES.map((line) => (
            <li key={line} className={LIST_ITEM_CLASS}>
              {line}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);

export default MLSystemDesignFrameworkSection;
