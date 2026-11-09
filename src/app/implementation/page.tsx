import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import SectionHeading from '@/components/ui/SectionHeading';
import PageSectionNav from '@/components/ui/PageSectionNav';
import AiMlPageShell from '@/components/sections/aiMl/AiMlPageShell';
import { BODY_TEXT_CLASS, FOCUS_RING, SECTION_CLASS } from '@/components/sections/sweDe/styles';
import {
  IMPLEMENTATION_BASE_PATH,
  IMPLEMENTATION_LANGUAGES,
  IMPLEMENTATION_MODULES,
} from '@/constants/implementation';

export const metadata: Metadata = {
  title: 'Implementation — Thomas To',
  description:
    'A polyglot systems engineering curriculum across SQL, Python, TypeScript, Spark, Rust, C++, Go, Swift, and Kotlin: language foundations, paradigms, algorithms, concurrency, frameworks from scratch, FFI versus network APIs, and architecture decisions.',
  alternates: { canonical: IMPLEMENTATION_BASE_PATH },
};

const SECTIONS = [
  { id: 'modules', label: 'Modules' },
  { id: 'languages', label: 'Languages' },
];

export default function ImplementationOverviewPage() {
  return (
    <AiMlPageShell
      eyebrow="Implementation"
      title="Nine languages,"
      titleAccent="one systems mindset"
      lede="A step-by-step curriculum that connects computer science fundamentals (memory layout, data structures, concurrency) to systems engineering and architecture, across SQL, Python, TypeScript, Spark, Rust, C++, Go, Swift, and Kotlin."
      backHref="/"
      backLabel="Back to home"
    >
      <PageSectionNav items={SECTIONS} />

      <section id="modules" className={SECTION_CLASS}>
        <SectionHeading eyebrow="Curriculum" title="Seven modules" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {IMPLEMENTATION_MODULES.map((entry) => (
            <Link
              key={entry.id}
              href={entry.href}
              className={`card-base p-5 transition-colors hover:border-blue-300 dark:hover:border-blue-700 ${FOCUS_RING}`}
            >
              <span className="text-micro text-zinc-400 block mb-1">{entry.eyebrow}</span>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                {entry.title} {entry.titleAccent}
              </h3>
              <p className={`mt-1.5 ${BODY_TEXT_CLASS}`}>{entry.summary}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400">
                Open module <ArrowRight size={13} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section id="languages" className={SECTION_CLASS}>
        <SectionHeading eyebrow="Scope" title="The nine languages" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {IMPLEMENTATION_LANGUAGES.map((language) => (
            <div key={language.id} className="card-base p-4">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{language.name}</h3>
              <p className={`mt-1 ${BODY_TEXT_CLASS}`}>{language.role}</p>
            </div>
          ))}
        </div>
      </section>
    </AiMlPageShell>
  );
}
