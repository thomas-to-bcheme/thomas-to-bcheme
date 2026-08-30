import Link from 'next/link';
import { ExternalLink, Youtube, Instagram } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';
import {
  EXTERNAL_REFERENCES,
  EXTERNAL_REFERENCE_GROUPS,
  PRACTICE_SYSTEM_CATEGORIES,
  type ExternalReferenceMedium,
} from '@/constants/systemDesignPrep/externalReferences';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1';

/** Per-medium icon override — reference.medium selects one of these, undefined falls back to ExternalLink. */
const MEDIUM_ICON: Record<ExternalReferenceMedium, typeof ExternalLink> = {
  video: Youtube,
  social: Instagram,
};

/**
 * The 30 external citations (opens in a new tab), grouped into Framework &
 * System Design / Development Lifecycles / Cross-Lifecycle Operating
 * Standards / Video Walkthroughs / Social Media Roundups / ML System Design
 * (EXTERNAL_REFERENCE_GROUPS), a condensed "practice these next" categorized
 * name list (PRACTICE_SYSTEM_CATEGORIES) bridging into the Real-World Designs
 * section above, plus the 2 internal /study-plan?board=... links to the raw
 * source whiteboards this page's content was synthesized from.
 */
const ExternalReferencesSection = () => (
  <section id="sources" className="scroll-mt-24 mt-20">
    <SectionHeading eyebrow="Sources" title="Where this page's content comes from" />

    <div className="space-y-8">
      {EXTERNAL_REFERENCE_GROUPS.map((group) => (
        <div key={group.id}>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{group.label}</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{group.description}</p>
          <ul className="mt-3 space-y-3">
            {EXTERNAL_REFERENCES.filter((reference) => reference.group === group.id).map((reference) => {
              const ReferenceIcon = reference.medium ? MEDIUM_ICON[reference.medium] : ExternalLink;
              return (
                <li key={reference.id} className="card-base p-4">
                  <a
                    href={reference.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 dark:text-blue-400 hover:underline rounded-sm ${FOCUS_RING}`}
                  >
                    {reference.title} <ReferenceIcon size={13} className="stroke-[2.5]" aria-hidden="true" />
                  </a>
                  <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {reference.whatItOffers}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>

    <div className="mt-10 pt-8 border-t border-zinc-100 dark:border-zinc-800">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Practice these next</h3>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        The{' '}
        <a
          href="#real-world-designs"
          className={`font-semibold text-blue-700 dark:text-blue-400 hover:underline rounded-sm ${FOCUS_RING}`}
        >
          Real-World Designs
        </a>{' '}
        section above works six classics — URL Shortener, Ride Sharing, Social Media Feed, Video
        Streaming, E-commerce, Chat App — in full depth. Condensed from the wider Top-100-style
        catalogs these boards draw on, here are ~25 more highest-signal named systems worth
        running through the same framework, grouped rather than ranked.
      </p>
      <div className="mt-4 space-y-4">
        {PRACTICE_SYSTEM_CATEGORIES.map((category) => (
          <div key={category.id}>
            <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{category.label}</h4>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500 leading-relaxed">{category.synthesis}</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {category.systems.map((system) => (
                <li
                  key={system}
                  className="text-micro font-semibold text-zinc-600 dark:text-zinc-400 rounded-full border border-zinc-100 dark:border-zinc-800 px-2 py-0.5"
                >
                  {system}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>

    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <Link
        href="/study-plan?board=design"
        className={`card-base p-4 text-sm font-semibold text-zinc-900 dark:text-white hover:border-blue-300 dark:hover:border-blue-700 transition-colors ${FOCUS_RING}`}
      >
        The raw whiteboard: design.excalidraw
      </Link>
      <Link
        href="/study-plan?board=system_design_MLE"
        className={`card-base p-4 text-sm font-semibold text-zinc-900 dark:text-white hover:border-blue-300 dark:hover:border-blue-700 transition-colors ${FOCUS_RING}`}
      >
        The raw whiteboard: system_design_MLE.excalidraw
      </Link>
    </div>
  </section>
);

export default ExternalReferencesSection;
