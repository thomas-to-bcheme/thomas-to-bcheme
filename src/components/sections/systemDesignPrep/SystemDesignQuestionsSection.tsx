import SectionHeading from '@/components/ui/SectionHeading';
import SystemDesignQuestionCard from './SystemDesignQuestionCard';
import { SYSTEM_DESIGN_CATEGORIES, SYSTEM_DESIGN_QUESTIONS } from '@/constants/systemDesignPrep/questions';

/**
 * The centerpiece — all 4 question categories in order (Data & Consistency,
 * Communication & APIs, Compute & Hosting, ML-Specific), each its own
 * <section id={category.id}> so the sidebar/mobile-toc can scroll-spy
 * straight to a category. Within communication-apis, real-time-vs-batch
 * renders first (it's authored first in that category's source file).
 */
const SystemDesignQuestionsSection = () => (
  <section className="mt-16">
    <SectionHeading
      eyebrow="The Centerpiece"
      title="Ask the right question before picking an answer"
    />
    <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-10">
      Four categories, each holding a handful of recurring decision cascades: a question, the
      clarifying sub-questions that narrow it, the approach options on the table, implementation
      notes one layer deeper, and what else the decision ripples into.
    </p>

    <div className="space-y-16">
      {SYSTEM_DESIGN_CATEGORIES.map((category) => {
        const questions = SYSTEM_DESIGN_QUESTIONS.filter((question) => question.category === category.id);

        return (
          <section key={category.id} id={category.id} className="scroll-mt-24">
            <SectionHeading eyebrow="Category" title={category.label} />
            <p className="max-w-2xl -mt-2 mb-6 text-sm text-zinc-500 dark:text-zinc-500 leading-relaxed">
              {category.description}
            </p>
            <div className="space-y-4">
              {questions.map((question) => (
                <SystemDesignQuestionCard key={question.id} question={question} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  </section>
);

export default SystemDesignQuestionsSection;
