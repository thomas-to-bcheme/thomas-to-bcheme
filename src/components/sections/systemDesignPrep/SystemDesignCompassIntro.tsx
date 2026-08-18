import Link from 'next/link';
import { Quote } from 'lucide-react';
import SweCompassDiagram from '@/components/features/SweCompassDiagram';
import SectionHeading from '@/components/ui/SectionHeading';

const EXTERNAL_LINK_CLASS = 'font-semibold text-blue-700 dark:text-blue-400 hover:underline';

/**
 * Framing intro, rendered first in main content — positions this page as a
 * working reference for real engineering judgment, not interview trivia,
 * then renders the real (imported, not reinvented) SweCompassDiagram
 * statically at rest and explains how its 3 axes map onto how the rest of
 * the page reads.
 */
const SystemDesignCompassIntro = () => (
  <section id="framing-intro" className="scroll-mt-24">
    <SectionHeading eyebrow="Before The Questions" title="A working reference, not interview trivia" />
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
      <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        <p>
          Navigating ambiguity and asking the right clarifying question before reaching for an
          implementation isn&apos;t an interview trick — it&apos;s the actual skill, valuable on the job
          independent of whoever&apos;s in the room, across a system&apos;s full lifecycle: design, build,
          operate, evolve.
        </p>
        <p>
          <Link href="/projects#swe-compass" className={EXTERNAL_LINK_CLASS}>
            The SWE Compass
          </Link>{' '}
          — three axes from one origin — is the lens this page reads through:
        </p>
        <ul className="space-y-2.5 pl-4">
          <li className="relative before:content-['—'] before:absolute before:-left-4 before:text-zinc-300 dark:before:text-zinc-700">
            <span className="font-semibold text-blue-700 dark:text-blue-400">End-to-end</span> — why the
            questions below are grouped into lifecycle-adjacent categories (data, communication, compute,
            ML) rather than one long undifferentiated list.
          </li>
          <li className="relative before:content-['—'] before:absolute before:-left-4 before:text-zinc-300 dark:before:text-zinc-700">
            <span className="font-semibold text-purple-700 dark:text-purple-400">Abstraction</span> — why
            each question&apos;s cascade climbs from a general principle down through concrete pattern
            options to a collapsed layer of implementation and vendor specifics.
          </li>
          <li className="relative before:content-['—'] before:absolute before:-left-4 before:text-zinc-300 dark:before:text-zinc-700">
            <span className="font-semibold text-amber-700 dark:text-amber-400">Time</span> — why questions
            cross-link via &quot;Also affects&quot; ripples, and why scaling-progression and the ML
            deployment risk ladder exist as their own entries rather than a footnote.
          </li>
        </ul>
        <p>
          Grounding this in something more than assertion:{' '}
          <a
            href="https://roadmap.sh/software-architect"
            target="_blank"
            rel="noopener noreferrer"
            className={EXTERNAL_LINK_CLASS}
          >
            roadmap.sh/software-architect
          </a>{' '}
          frames architecture as ongoing judgment — decision-making under ambiguity as a named skill,
          documentation as a continuously-maintained artifact rather than a one-time deliverable, and
          architecture judged by long-term maintainability, not just greenfield design. That&apos;s the
          frame this whole page is built on.
        </p>
        <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-900/10 p-5 sm:p-6">
          <span className="flex items-center gap-1.5 text-micro font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-3">
            <Quote size={12} className="stroke-[2.5]" /> North Star
          </span>
          <blockquote className="text-sm sm:text-base italic text-blue-900 dark:text-blue-200 leading-relaxed border-l-2 border-blue-300 dark:border-blue-700 pl-4">
            &quot;Navigate ambiguity by understanding what to use, when to use it, and why to use
            it.&quot;
          </blockquote>
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mt-3">— Thomas To</p>
        </div>
      </div>
      <SweCompassDiagram activeAxis={null} />
    </div>
  </section>
);

export default SystemDesignCompassIntro;
