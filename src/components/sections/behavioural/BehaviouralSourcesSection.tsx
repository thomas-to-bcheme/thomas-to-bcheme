import React from 'react';
import { ExternalLink } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';
import { SOURCES, SOURCE_GROUPS } from '@/constants/behavioural/sources';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1';

/**
 * Closing section — the copyright-respecting payoff of the whole page.
 * Structural copy of systemDesignPrep/ExternalReferencesSection.tsx's
 * grouped-list pattern: the 3 primary resources (course, announcement post,
 * book) this page is a condensed take on, plus a direct link to every
 * individual chapter this page's sections are structured around, in course
 * order, so a reader can go straight to the original for anything this page
 * couldn't cover.
 */
const BehaviouralSourcesSection = () => (
  <section id="sources" className="scroll-mt-24 mt-20">
    <SectionHeading eyebrow="Sources" title="Where this page's content comes from" />
    <p className="mb-8 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
      Everything above is my own condensed, restructured take on ByteByteGo&apos;s behavioral
      interview course — written in my own words, not a transcription of theirs. For the full
      depth, the level-by-level example stories, and the parts this page had to leave out, go to
      the source.
    </p>

    <div className="space-y-8">
      {SOURCE_GROUPS.map((group) => (
        <div key={group.id}>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{group.label}</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{group.description}</p>
          <ul className="mt-3 space-y-3">
            {SOURCES.filter((source) => source.group === group.id).map((source) => (
              <li key={source.id} className="card-base p-4">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 dark:text-blue-400 hover:underline rounded-sm ${FOCUS_RING}`}
                >
                  {source.title} <ExternalLink size={13} className="stroke-[2.5]" aria-hidden="true" />
                </a>
                <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {source.whatItOffers}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </section>
);

export default BehaviouralSourcesSection;
