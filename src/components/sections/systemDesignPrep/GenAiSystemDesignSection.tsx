import { Link2 } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';
import FrameworkStepList from '@/components/ui/FrameworkStepList';
import { GENAI_FRAMEWORK_STEPS, GENAI_CROSS_REFERENCES } from '@/constants/systemDesignPrep/genAiSystemDesign';

/**
 * The GenAI-specific delta on top of the ML-Specific Framework directly
 * above — same FrameworkStepList component, one further layer bolted on: a
 * model that also has to generate, not just predict, plus a subsystem
 * (retrieval, safety filtering, post-processing) chained around it that a
 * discriminative model never needed. Closes with a compact cross-reference
 * block rather than a second Similarities/Differences grid — that device is
 * already used once by the ML section above; repeating it a third time in a
 * row would read templated.
 */
const GenAiSystemDesignSection = () => (
  <section id="genai-system-design" className="scroll-mt-24 mt-16">
    <SectionHeading eyebrow="The GenAI-Specific Delta" title="The extra layer a generative model bolts on" />
    <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
      Everything in the{' '}
      <a href="#ml-system-design-framework" className="font-semibold text-blue-700 dark:text-blue-400 hover:underline">
        ML framework above
      </a>{' '}
      assumes a model that classifies or predicts. A generative model adds one more layer on top of
      that: a model that also has to generate, not just predict — and a subsystem chained around it
      that a discriminative model never needed.
    </p>

    <FrameworkStepList steps={GENAI_FRAMEWORK_STEPS} />

    <div className="card-base p-5 mt-10">
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-white mb-3">
        <Link2 size={15} className="stroke-[2.5]" /> How This Plugs Into the Rest of the Page
      </h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
        None of this replaces the SWE or ML content elsewhere on this page — it's the same components
        (load balancers, security, metrics) applied to a generative core instead of a discriminative
        one.
      </p>
      <div className="flex flex-wrap gap-2">
        {GENAI_CROSS_REFERENCES.map((crossLink) => (
          <a
            key={crossLink.href}
            href={crossLink.href}
            className="tag-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
          >
            {crossLink.label}
          </a>
        ))}
      </div>
    </div>
  </section>
);

export default GenAiSystemDesignSection;
