import React from 'react';
import { getTermBySlug, type GlossaryTerm } from '@/constants/glossary';

interface GlossaryTermCardProps {
  term: GlossaryTerm;
  /** Clicking a related-term pill needs to clear any active search filter
   * before it can scroll to the target — see GlossaryBrowser's
   * pendingTargetSlug handling for why this can't be a synchronous scroll
   * inside this component. */
  onNavigateToTerm: (slug: string) => void;
}

/**
 * One dictionary-style row — deliberately not a `.card-base` card (that unit
 * is reserved for the diagram wrapper and aggregate blocks). At 200 short
 * lookup entries, individual bordered boxes would read as "changelog with
 * different data"; a hairline-rule index list reads as a reference instead.
 * Term name in Geist Mono marks "this is vocabulary," distinct from the
 * site's Geist Sans prose headings.
 */
const GlossaryTermCard = ({ term, onNavigateToTerm }: GlossaryTermCardProps) => {
  const relatedTerms = (term.relatedSlugs ?? [])
    .map((slug) => getTermBySlug(slug))
    .filter((related): related is GlossaryTerm => {
      if (!related) {
        console.warn(`[glossary] term "${term.slug}" has a relatedSlugs entry that doesn't resolve`);
        return false;
      }
      return true;
    });

  return (
    <div id={term.slug} className="scroll-mt-24 py-4 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0">
      <dt className="font-mono text-sm font-semibold text-zinc-900 dark:text-white">{term.term}</dt>
      <dd className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
        {term.definition || <span className="italic text-zinc-400 dark:text-zinc-600">Definition coming soon.</span>}
      </dd>
      {relatedTerms.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {relatedTerms.map((related) => (
            <button
              key={related.slug}
              type="button"
              onClick={() => onNavigateToTerm(related.slug)}
              className="tag-blue hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
            >
              {related.term}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GlossaryTermCard;
