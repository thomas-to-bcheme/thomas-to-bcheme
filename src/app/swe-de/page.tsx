import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import SectionHeading from '@/components/ui/SectionHeading';
import PageSectionNav from '@/components/ui/PageSectionNav';
import { NorthStarCallout, NorthStarQuestions } from '@/components/ui/NorthStarCallout';
import AiMlPageShell from '@/components/sections/aiMl/AiMlPageShell';
import FoundationsAccordion from '@/components/sections/systemDesignPrep/foundations/FoundationsAccordion';
import BookCard from '@/components/sections/sweDe/BookCard';
import BookSequence from '@/components/sections/sweDe/BookSequence';
import PathAssessment from '@/components/sections/sweDe/PathAssessment';
import ReadingPathStages from '@/components/sections/sweDe/ReadingPathStages';
import { BODY_TEXT_CLASS, FOCUS_RING, SECTION_CLASS } from '@/components/sections/sweDe/styles';
import {
  BOOK_TRACK_LABELS,
  BOOK_TRACK_ORDER,
  OREILLY_BOOKS,
  READING_STAGES,
  START_HERE_PATH,
  SWE_DE_BASE_PATH,
  SWE_DE_LEVELS,
} from '@/constants/sweDe';

export const metadata: Metadata = {
  title: 'SWE/DE Reading Path — Thomas To',
  description:
    'An O\'Reilly reading path for data engineering end to end, then software engineering, ordered hardware → application → distributed — with first-principles explanations of CPU-bound data work, storage engines (B-tree vs LSM-tree), SQL and Spark execution, and why Kubernetes and Airflow are the standards.',
  alternates: { canonical: SWE_DE_BASE_PATH },
};

const SECTIONS = [
  { id: 'north-star', label: 'North Star' },
  { id: 'assessment', label: 'Assessment' },
  { id: 'start-here', label: 'Start here' },
  { id: 'reading-path', label: 'Reading path' },
  { id: 'levels', label: 'Three levels' },
  { id: 'books', label: 'All books' },
];

const booksByTrack = BOOK_TRACK_ORDER.map((track) => ({
  track,
  books: OREILLY_BOOKS.filter((book) => book.track === track),
})).filter((group) => group.books.length > 0);

export default function SweDeOverviewPage() {
  return (
    <AiMlPageShell
      eyebrow="Software & Data Engineering"
      title="From hardware to code"
      titleAccent="to orchestration"
      lede="Data engineering isn't just Spark, SQL, or pipelines. It means understanding how a CPU moves bytes, how a storage engine turns a query into I/O, and how a cluster stays correct while machines fail. This is an O'Reilly reading path ordered that way: data engineering end to end first, then software engineering as the base for designing and scaling data-intensive applications, each step argued from first principles."
      backHref="/"
      backLabel="Back to home"
    >
      <PageSectionNav items={SECTIONS} />

      <section id="north-star" className={SECTION_CLASS}>
        <SectionHeading eyebrow="How to read this" title="What to use, when, and why" />
        <div className={`grid gap-6 lg:grid-cols-2 lg:items-start ${BODY_TEXT_CLASS}`}>
          <NorthStarCallout />
          <NorthStarQuestions />
        </div>
        <p className={`mt-4 max-w-3xl ${BODY_TEXT_CLASS}`}>
          Every topic on the three level pages follows these questions in order: what the decision
          is, why the hardware or algorithm makes one answer cheaper, and how to apply it.
        </p>
      </section>

      <section id="assessment" className={SECTION_CLASS}>
        <SectionHeading eyebrow="Review" title="Assessing the usual starting path" />
        <p className={`mb-4 max-w-3xl ${BODY_TEXT_CLASS}`}>
          A widely shared list of 20 data-engineering books (architecture, pipelines, storage + SQL,
          software craft) suggests starting with the five below. It is a good list of tools. It skips
          the layers underneath them: hardware, storage engines, SQL, streaming theory, and
          orchestration.
        </p>
        <PathAssessment />
      </section>

      <section id="start-here" className={SECTION_CLASS}>
        <SectionHeading eyebrow="If you read only five" title="Start here" />
        <div className="card-base p-4 sm:p-5 border-l-2 border-l-blue-400 dark:border-l-blue-500">
          <BookSequence bookIds={START_HERE_PATH} />
          <p className={`mt-2 ${BODY_TEXT_CLASS}`}>
            Lifecycle, then the map of the field, then the storage engine underneath it, then the
            query language on top, then the distributed engine that runs it. After that, follow the
            staged path below.
          </p>
        </div>
      </section>

      <section id="reading-path" className={SECTION_CLASS}>
        <SectionHeading eyebrow="The full path" title="Hardware → code → orchestration" />
        <p className={`mb-4 max-w-3xl ${BODY_TEXT_CLASS}`}>
          Each stage builds on the previous one, and each ends on something you can now explain. The
          software engineering base (last stage) runs alongside the rest rather than after it.
        </p>
        <ReadingPathStages stages={READING_STAGES} />
      </section>

      <section id="levels" className={SECTION_CLASS}>
        <SectionHeading eyebrow="Go deeper" title="Three levels of thinking" />
        <div className="grid gap-4 md:grid-cols-3">
          {SWE_DE_LEVELS.map((level) => (
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
                Read the {level.navLabel.toLowerCase()} level <ArrowRight size={13} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section id="books" className={SECTION_CLASS}>
        <SectionHeading eyebrow="Reference" title={`All ${OREILLY_BOOKS.length} books, by track`} />
        <p className={`mb-4 max-w-3xl ${BODY_TEXT_CLASS}`}>
          Every book links to O&apos;Reilly Learning with its ISBN. Three books from the original list
          are not on O&apos;Reilly and were replaced: Computer Systems: A Programmer&apos;s Perspective
          by Dive Into Systems, SQL Performance Explained by PostgreSQL Query Optimization, and A
          Philosophy of Software Design by Fundamentals of Software Engineering.
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
    </AiMlPageShell>
  );
}
