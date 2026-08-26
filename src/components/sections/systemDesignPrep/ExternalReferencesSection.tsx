import Link from 'next/link';
import { ExternalLink, Youtube, Instagram } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';
import {
  EXTERNAL_REFERENCES,
  EXTERNAL_REFERENCE_GROUPS,
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
 * (EXTERNAL_REFERENCE_GROUPS), plus the 2 internal /study-plan?board=... links
 * to the raw source whiteboards this page's content was synthesized from.
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
