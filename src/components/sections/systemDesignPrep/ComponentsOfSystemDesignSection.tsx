import SectionHeading from '@/components/ui/SectionHeading';
import SystemDesignQuestionCard from './SystemDesignQuestionCard';
import { COMPONENTS_OF_SYSTEM_DESIGN_QUESTIONS } from '@/constants/systemDesignPrep/questions/components';
import { COMPONENT_FRAMING_TOPICS, DESIGN_PRINCIPLES } from '@/constants/systemDesignPrep/componentsOfSystemDesign';

/**
 * The building blocks every system-design answer pulls from — networking,
 * traffic management, storage, partitioning, and security — worked as full
 * decision cascades (reusing SystemDesignQuestionCard directly, outside the
 * category-filtered question bank) for the genuinely multi-way forks, and
 * cross-linked rather than duplicated for topics (caching, replication,
 * scaling, API protocol choice) that already have real depth elsewhere on
 * this page. Closes with the standard every choice above gets checked
 * against: simple, built for scale, designed for failure, automated with
 * observability, and revisited as requirements evolve.
 */
const ComponentsOfSystemDesignSection = () => (
  <section id="components-of-system-design" className="scroll-mt-24 mt-20">
    <SectionHeading eyebrow="Reference" title="The components of system design" />
    <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-8">
      The building blocks underneath any high-level design — worked as full trade-off comparisons
      where the choice genuinely forks, and cross-linked to where the depth already lives on this
      page where it doesn&apos;t need repeating.
    </p>

    <div className="space-y-4">
      {COMPONENTS_OF_SYSTEM_DESIGN_QUESTIONS.map((question) => (
        <SystemDesignQuestionCard key={question.id} question={question} />
      ))}
    </div>

    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      {COMPONENT_FRAMING_TOPICS.map((topic) => (
        <div key={topic.id} className="rounded-lg border border-zinc-100 dark:border-zinc-800 p-3">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">{topic.label}</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500 leading-relaxed">{topic.summary}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {topic.crossLinks.map((crossLink) => (
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
      ))}
    </div>

    <div className="card-base p-5 mt-8">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">
        Design principles every component above gets checked against
      </h3>
      <ul className="space-y-3">
        {DESIGN_PRINCIPLES.map((principle) => (
          <li key={principle.id}>
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{principle.label}</p>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-500 leading-relaxed">{principle.summary}</p>
            {principle.crossLink && (
              <a
                href={principle.crossLink.href}
                className="mt-1 inline-block tag-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              >
                {principle.crossLink.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  </section>
);

export default ComponentsOfSystemDesignSection;
