'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useActiveSection } from '@/hooks/useActiveSection';
import { scrollToAnchor } from '@/lib/scrollToAnchor';
import { GLOSSARY_CATEGORIES, getTermsByCategory, type GlossaryCategoryId, type GlossaryTerm } from '@/constants/glossary';
import { GLOSSARY_TOC_ITEMS } from '@/constants/glossaryToc';
import GlossaryStackDiagram, { CATEGORY_ICON_CHIP_CLASSES } from '@/components/features/GlossaryStackDiagram';
import GlossaryTermCard from './GlossaryTermCard';

const TOC_IDS = GLOSSARY_TOC_ITEMS.map((item) => item.id);

/**
 * Owns everything interactive on /glossary: the diagram's active-category
 * highlight, search filtering, and cross-term navigation. Filtering is a
 * plain synchronous `.filter()` over a static in-memory array — no router,
 * no debounce. JobFilters' URL-debounce pattern exists because it re-queries
 * Neon server-side for a paginated live dataset; a static ~200-entry array
 * needs none of that, and importing the pattern here would add complexity
 * (ref-tracking sync effects, transition state) the glossary has no use for.
 */
const GlossaryBrowser = () => {
  const [query, setQuery] = useState('');
  const [pendingTargetSlug, setPendingTargetSlug] = useState<string | null>(null);
  const activeCategoryId = useActiveSection(TOC_IDS) as GlossaryCategoryId | null;
  const prefersReducedMotion = useReducedMotion() ?? false;
  const hasHandledInitialHash = useRef(false);

  const normalizedQuery = query.trim().toLowerCase();

  const totalTerms = useMemo(
    () => GLOSSARY_CATEGORIES.reduce((sum, category) => sum + getTermsByCategory(category.id).length, 0),
    []
  );

  const resultsByCategory = useMemo(() => {
    const map = new Map<GlossaryCategoryId, GlossaryTerm[]>();
    for (const category of GLOSSARY_CATEGORIES) {
      const terms = getTermsByCategory(category.id);
      const filtered = normalizedQuery
        ? terms.filter(
            (term) =>
              term.term.toLowerCase().includes(normalizedQuery) ||
              term.definition.toLowerCase().includes(normalizedQuery) ||
              category.label.toLowerCase().includes(normalizedQuery)
          )
        : terms;
      map.set(category.id, filtered);
    }
    return map;
  }, [normalizedQuery]);

  const totalMatches = useMemo(
    () => Array.from(resultsByCategory.values()).reduce((sum, list) => sum + list.length, 0),
    [resultsByCategory]
  );

  // Related-pill click (GlossaryTermCard): the target may currently be
  // filtered out of the DOM, so clear the query first and defer the actual
  // scroll+focus to this effect, which fires after the re-render restores
  // the full list.
  useEffect(() => {
    if (!pendingTargetSlug) return;
    scrollToAnchor(pendingTargetSlug, { prefersReducedMotion });
    setPendingTargetSlug(null);
  }, [pendingTargetSlug, prefersReducedMotion]);

  const handleNavigateToTerm = (slug: string) => {
    setQuery('');
    setPendingTargetSlug(slug);
  };

  // Cold-load deep link (/glossary#some-slug or #some-category). The query
  // always starts empty, so every term/category id is already in the DOM at
  // first paint — the only thing native anchor navigation is missing here is
  // moving focus for keyboard/screen-reader users, which scrollToAnchor adds.
  useEffect(() => {
    if (hasHandledInitialHash.current) return;
    hasHandledInitialHash.current = true;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    scrollToAnchor(decodeURIComponent(hash), { prefersReducedMotion });
  }, [prefersReducedMotion]);

  return (
    <div>
      <div className="card-base p-6 sm:p-8 mb-8">
        <GlossaryStackDiagram activeCategoryId={activeCategoryId} />
      </div>

      <div className="sticky top-24 z-10 py-3 mb-6 bg-white/90 dark:bg-black/90 backdrop-blur-sm border-b border-zinc-100 dark:border-zinc-800">
        <label htmlFor="glossary-search" className="text-micro text-zinc-400 block mb-1.5">
          Search
        </label>
        <div className="relative max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            id="glossary-search"
            type="search"
            className="input-base appearance-none w-full pl-9"
            placeholder={`Search ${totalTerms} terms…`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {normalizedQuery ? `${totalMatches} of ${totalTerms} terms match` : `Showing all ${totalTerms} terms`}
        </p>
      </div>

      {totalMatches === 0 && normalizedQuery && (
        <div className="card-base p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No terms match &ldquo;{query.trim()}&rdquo;. Try a different word, or browse a category from the sidebar.
        </div>
      )}

      <div className="space-y-12">
        {GLOSSARY_CATEGORIES.map((category) => {
          const terms = resultsByCategory.get(category.id) ?? [];
          if (terms.length === 0) return null;
          const Icon = category.icon;
          const chipColors = CATEGORY_ICON_CHIP_CLASSES[category.id];

          return (
            <section key={category.id} id={category.id} className="scroll-mt-24">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <span className="text-micro text-zinc-400 block mb-2">{category.eyebrow}</span>
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    {category.label}
                  </h2>
                  <p className="mt-1.5 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">{category.description}</p>
                </div>
                <span
                  className={cn(
                    'hidden sm:flex shrink-0 h-11 w-11 items-center justify-center rounded-xl border',
                    chipColors.chip
                  )}
                >
                  <Icon size={20} className={chipColors.icon} />
                </span>
              </div>
              <dl>
                {terms.map((term) => (
                  <GlossaryTermCard key={term.slug} term={term} onNavigateToTerm={handleNavigateToTerm} />
                ))}
              </dl>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default GlossaryBrowser;
