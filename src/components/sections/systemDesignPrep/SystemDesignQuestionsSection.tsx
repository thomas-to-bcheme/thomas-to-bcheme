import SectionHeading from '@/components/ui/SectionHeading';
import SystemDesignQuestionCard from './SystemDesignQuestionCard';
import { SYSTEM_DESIGN_CATEGORIES, SYSTEM_DESIGN_QUESTIONS } from '@/constants/systemDesignPrep/questions';

/**
 * The centerpiece — all 6 lifecycle-stage categories (Design, Data, Model,
 * Backend, Frontend, Ops) in fixed reading order, each its own
 * <section id={category.id}> so the sidebar/mobile-toc can scroll-spy
 * straight to a category. Every category leads with 2-4 short, universal
 * guiding questions (the breadth pass) before the specific decision-cascade
 * cards underneath (the depth pass) — Design grounds the whole bank in the
 * non-functional characteristics from #core-characteristics before Data ->
 * Model -> Backend -> Frontend -> Ops work through what each layer adds
 * functionally on top of that baseline.
 */
const GUIDING_QUESTION_CLASS =
  'text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-4 relative before:content-[\'—\'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700';

const SystemDesignQuestionsSection = () => (
  <section className="mt-16">
    <SectionHeading
      eyebrow="The Centerpiece"
      title="Ask the right question before picking an answer"
    />
    <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-10">
      Six categories, worked through in two passes. Design comes first and stays deliberately
      non-functional — it grounds every later decision in the{' '}
      <a
        href="#core-characteristics"
        className="font-semibold text-blue-700 dark:text-blue-400 hover:underline"
      >
        core characteristics above
      </a>{' '}
      before anything gets built. Data, Model, Backend, Frontend, and Ops then work through what
      each layer adds functionally on top of that baseline. Each category opens with a few
      guiding questions — a scannable primer, not the full picture — followed by the recurring
      decision cascades underneath: a question, the clarifying sub-questions that narrow it, the
      approach options on the table, implementation notes one layer deeper, and what else the
      decision ripples into.
    </p>

    <div className="space-y-16">
      {SYSTEM_DESIGN_CATEGORIES.map((category) => {
        const questions = SYSTEM_DESIGN_QUESTIONS.filter((question) => question.category === category.id);

        return (
          <section key={category.id} id={category.id} className="scroll-mt-24">
            <SectionHeading eyebrow="Category" title={category.label} />
            <ul className="max-w-2xl -mt-2 mb-3 space-y-1.5">
              {category.guidingQuestions.map((guidingQuestion) => (
                <li key={guidingQuestion} className={GUIDING_QUESTION_CLASS}>
                  {guidingQuestion}
                </li>
              ))}
            </ul>
            <a
              href="#sources"
              className="inline-block mb-6 text-sm font-semibold text-blue-700 dark:text-blue-400 hover:underline"
            >
              Want more depth? See Sources →
            </a>
            <div className="space-y-4">
              {questions.map((question) => (
                <div key={question.id}>
                  {question.subsectionLabel && (
                    <div className="mb-4 mt-2 border-t border-zinc-100 dark:border-zinc-800 pt-6">
                      <span className="text-micro font-bold uppercase tracking-widest text-zinc-400">
                        {question.subsectionLabel}
                      </span>
                      {question.subsectionDescription && (
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500 leading-relaxed max-w-2xl">
                          {question.subsectionDescription}
                        </p>
                      )}
                    </div>
                  )}
                  <SystemDesignQuestionCard question={question} />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  </section>
);

export default SystemDesignQuestionsSection;
