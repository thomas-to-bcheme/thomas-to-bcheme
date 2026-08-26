import SectionHeading from '@/components/ui/SectionHeading';
import {
  COMPONENT_FRAMING_TOPICS,
  DESIGN_PRINCIPLES,
  RELOCATED_COMPONENT_QUESTIONS,
} from '@/constants/systemDesignPrep/componentsOfSystemDesign';

/**
 * The building blocks every system-design answer pulls from — networking,
 * traffic management, storage, partitioning, and security. The 5 genuinely
 * multi-way forks among these now render as full decision cascades inline
 * in "The Questions" (under Design and Data); this section links to them
 * rather than re-rendering them, and instead frames the topics (caching,
 * replication, scaling, API protocol choice) that already have real depth
 * elsewhere on this page without duplicating it here. Closes with the
 * standard every choice above gets checked against: simple, built for
 * scale, designed for failure, automated with observability, and revisited
 * as requirements evolve.
 */
const ComponentsOfSystemDesignSection = () => (
  <section id="components-of-system-design" className="scroll-mt-24 mt-20">
    <SectionHeading eyebrow="Reference" title="The components of system design" />
    <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-8">
      The building blocks underneath any high-level design — framed here, with the genuinely
      multi-way forks worked as full decision cascades in{' '}
      <a href="#design" className="font-semibold text-blue-700 dark:text-blue-400 hover:underline">
        The Questions
      </a>{' '}
      below, and cross-linked to where the rest of the depth already lives on this page.
    </p>

    <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
      These five are now full decision cascades inside The Questions — Design and Data:
    </p>
    <div className="flex flex-wrap gap-2">
      {RELOCATED_COMPONENT_QUESTIONS.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="tag-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
        >
          {item.label}
        </a>
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
