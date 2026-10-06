import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import SectionHeading from '@/components/ui/SectionHeading';
import PageSectionNav from '@/components/ui/PageSectionNav';
import AiMlPageShell from '@/components/sections/aiMl/AiMlPageShell';
import FoundationsAccordion from '@/components/sections/systemDesignPrep/foundations/FoundationsAccordion';
import ComparisonTable from '@/components/sections/sweDe/ComparisonTable';
import BookCard from '@/components/sections/deployOps/BookCard';
import KeyTerms from '@/components/sections/deployOps/KeyTerms';
import LifecycleStages from '@/components/sections/deployOps/LifecycleStages';
import ReadingPathStages, { BookSequence } from '@/components/sections/deployOps/ReadingPathStages';
import { BODY_TEXT_CLASS, FOCUS_RING, SECTION_CLASS } from '@/components/sections/sweDe/styles';
import {
  BOOK_TRACK_LABELS,
  BOOK_TRACK_ORDER,
  DEPLOYOPS_BASE_PATH,
  DEPLOYOPS_BOOKS,
  DEPLOYOPS_LEVELS,
  DETERMINISM_SPECTRUM,
  LIFECYCLE_DERIVATION,
  LIFECYCLE_PRINCIPLES,
  LIFECYCLE_STAGES,
  PARADIGM_ROWS,
  READING_STAGES,
  START_HERE_PATH,
  TOPICS_BY_LEVEL,
  getTermsForLevel,
  type ComparisonTable as ComparisonTableData,
} from '@/constants/deployOps';

export const metadata: Metadata = {
  title: 'DeployOps — Thomas To',
  description:
    'The software delivery lifecycle from first principles: why each stage exists and what invariant it protects, then how it specializes for traditional DevOps and for AI, LLM and MLOps. Includes a staged reading path of core O’Reilly resources.',
  alternates: { canonical: DEPLOYOPS_BASE_PATH },
};

const SECTIONS = [
  { id: 'premise', label: 'First principles' },
  { id: 'stages', label: 'Nine stages' },
  { id: 'compare', label: 'Determinism' },
  { id: 'specializations', label: 'Specializations' },
  { id: 'start-here', label: 'Start here' },
  { id: 'reading-path', label: 'Reading path' },
  { id: 'books', label: 'All books' },
  { id: 'terms', label: 'Key terms' },
];

const paradigmTable: ComparisonTableData = {
  caption: 'How the same lifecycle differs across DevOps, MLOps and LLMOps',
  rowHeader: 'Question',
  columns: ['DevOps', 'MLOps', 'LLMOps'],
  rows: PARADIGM_ROWS.map((row) => ({
    id: row.dimension.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    label: row.dimension,
    cells: [row.devops, row.mlops, row.llmops],
  })),
};

const booksByTrack = BOOK_TRACK_ORDER.map((track) => ({
  track,
  books: DEPLOYOPS_BOOKS.filter((book) => book.track === track),
})).filter((group) => group.books.length > 0);

export default function DeployOpsOverviewPage() {
  return (
    <AiMlPageShell
      eyebrow="DeployOps"
      title="The delivery loop,"
      titleAccent="from first principles"
      lede="Every way of shipping software, from a single script to an LLM agent, is the same loop: turn an idea into running behavior, then feed what you observe back into the next idea. Each stage exists because the stage before it leaves one specific uncertainty open. This overview derives the loop, then points to two specializations that apply it: traditional DevOps, and AI, LLM and MLOps."
      backHref="/"
      backLabel="Back to home"
    >
      <PageSectionNav items={SECTIONS} />

      <section id="premise" className={SECTION_CLASS}>
        <SectionHeading eyebrow="Start here" title="Software is a claim you have to be able to check" />
        <p className={`mb-4 max-w-3xl ${BODY_TEXT_CLASS}`}>
          A change says &ldquo;this does what we want, for real users.&rdquo; A claim is only worth
          something if it can be checked cheaply, repeated, and undone. The lifecycle is what you
          get when you keep adding scale, and ask at each step what just became uncertain.
        </p>
        <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {LIFECYCLE_DERIVATION.map((step) => (
            <li key={step.id} className="card-base p-4">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">{step.trigger}</p>
              <p className={`mt-1 ${BODY_TEXT_CLASS}`}>{step.consequence}</p>
            </li>
          ))}
        </ol>
        <h3 className="mt-8 mb-3 text-sm font-bold text-zinc-900 dark:text-white">
          Three ideas explain almost every tool
        </h3>
        <ul className="grid gap-3 md:grid-cols-3">
          {LIFECYCLE_PRINCIPLES.map((principle) => (
            <li key={principle.id} className="card-base p-4 border-l-2 border-l-blue-400 dark:border-l-blue-500">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">{principle.title}</p>
              <p className={`mt-1 ${BODY_TEXT_CLASS}`}>{principle.summary}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="stages" className={SECTION_CLASS}>
        <SectionHeading eyebrow="The loop" title="Nine stages, each closing one uncertainty" />
        <p className={`mb-4 max-w-3xl ${BODY_TEXT_CLASS}`}>
          Each card states the problem a stage solves and the property it protects, then links to
          where the DevOps and AI/LLM/MLOps pages specialize it.
        </p>
        <LifecycleStages stages={LIFECYCLE_STAGES} topicsByLevel={TOPICS_BY_LEVEL} />
      </section>

      <section id="compare" className={SECTION_CLASS}>
        <SectionHeading eyebrow="Same loop, different guarantees" title="How much determinism you can have" />
        <p className={`mb-4 max-w-3xl ${BODY_TEXT_CLASS}`}>
          Deterministic means the same inputs give the same output. Code and builds can be held to
          that. Model training can only get close, and LLM behavior can only be bounded
          statistically. Knowing which guarantee a stage can offer decides how you check it.
        </p>
        <ol className="mb-6 grid gap-3 md:grid-cols-3" aria-label="Determinism spectrum">
          {DETERMINISM_SPECTRUM.map((step, position) => (
            <li key={step.id} className="card-base p-4">
              <span className="text-micro font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                {`${position + 1}. ${step.label}`}
              </span>
              <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-white">{step.example}</p>
              <p className={`mt-1 ${BODY_TEXT_CLASS}`}>{step.guarantee}</p>
            </li>
          ))}
        </ol>
        <ComparisonTable table={paradigmTable} />
      </section>

      <section id="specializations" className={SECTION_CLASS}>
        <SectionHeading eyebrow="Go deeper" title="Two specializations of the same loop" />
        <div className="grid gap-4 md:grid-cols-2">
          {DEPLOYOPS_LEVELS.map((level) => (
            <Link
              key={level.id}
              href={level.href}
              className={`card-base p-5 transition-colors hover:border-blue-300 dark:hover:border-blue-700 ${FOCUS_RING}`}
            >
              <span className="text-micro text-zinc-400 block mb-1">{level.eyebrow}</span>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                {level.title} {level.titleAccent}
              </h3>
              <p className={`mt-1.5 ${BODY_TEXT_CLASS}`}>{level.summary}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400">
                Read the {level.navLabel} page <ArrowRight size={13} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section id="start-here" className={SECTION_CLASS}>
        <SectionHeading eyebrow="If you read only three" title="Start here" />
        <div className="card-base p-4 sm:p-5 border-l-2 border-l-blue-400 dark:border-l-blue-500">
          <BookSequence bookIds={START_HERE_PATH} />
          <p className={`mt-2 ${BODY_TEXT_CLASS}`}>
            The broadest map of building on foundation models, then the Observe stage that both
            specializations share, then the lifecycle applied to LLM systems. After that, follow the
            staged path below.
          </p>
        </div>
      </section>

      <section id="reading-path" className={SECTION_CLASS}>
        <SectionHeading eyebrow="The full path" title="Foundations to agents" />
        <p className={`mb-4 max-w-3xl ${BODY_TEXT_CLASS}`}>
          Each step builds on the previous one and ends on something you can now explain. None of the
          eight core books covers git, CI, containers or Kubernetes, so the DevOps steps use a few
          widely read titles that are not on that list; they are marked on each card.
        </p>
        <ReadingPathStages stages={READING_STAGES} />
      </section>

      <section id="books" className={SECTION_CLASS}>
        <SectionHeading eyebrow="Reference" title={`All ${DEPLOYOPS_BOOKS.length} books, by track`} />
        <p className={`mb-4 max-w-3xl ${BODY_TEXT_CLASS}`}>
          Takeaways are inferred from each book&apos;s table of contents, publisher description or
          reputation, not from the full text. Three of the eight core titles are early releases, and one
          (LLMs in Production) is published by Manning rather than O&apos;Reilly.
        </p>
        <div className="space-y-3">
          {booksByTrack.map(({ track, books }) => (
            <FoundationsAccordion
              key={track}
              id={`track-${track}`}
              title={BOOK_TRACK_LABELS[track]}
              summary={books.map((book) => book.title).join(' · ')}
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {books.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            </FoundationsAccordion>
          ))}
        </div>
      </section>

      <section id="terms" className={SECTION_CLASS}>
        <SectionHeading eyebrow="Vocabulary" title="Key terms" />
        <KeyTerms id="terms-overview" terms={getTermsForLevel('overview')} />
      </section>
    </AiMlPageShell>
  );
}
