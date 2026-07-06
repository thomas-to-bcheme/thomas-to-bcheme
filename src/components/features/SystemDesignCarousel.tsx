'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SYSTEM_DESIGNS } from '@/constants/systemDesign';
import SystemDesignDiagram from './SystemDesignDiagram';

interface SystemDesignCarouselProps {
  /** Optional section heading. */
  heading?: string;
  /** Optional section subheading/intro. */
  subheading?: string;
  /**
   * When true, reflect the current slide in the URL hash and scroll the
   * section into view on deep-link. Enable only on the /system-design route so
   * the homepage inline instance never fights the URL.
   */
  syncHash?: boolean;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const SystemDesignCarousel = ({
  heading,
  subheading,
  syncHash = false,
}: SystemDesignCarouselProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'start' });
  const sectionRef = useRef<HTMLElement>(null);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();
    setSelectedIndex(index);
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());

    // Reflect current slide in the URL (replaceState → no history spam, no
    // hashchange feedback loop with the deep-link listener below).
    if (syncHash) {
      const projectId = SYSTEM_DESIGNS[index]?.projectId;
      if (projectId) {
        window.history.replaceState(null, '', `#${projectId}`);
      }
    }
  }, [emblaApi, syncHash]);

  // Deep-link: jump to the slide matching the URL hash (on mount + hashchange).
  // Declared BEFORE the select-listener effect so an incoming hash is honored
  // before syncHash's onSelect would overwrite it.
  useEffect(() => {
    if (!emblaApi) return;

    const scrollToHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (!hash) return;
      const index = SYSTEM_DESIGNS.findIndex((design) => design.projectId === hash);
      if (index < 0) return;

      emblaApi.scrollTo(index, true); // jump=true → no long animated sweep
      // Bring the carousel into view only on the route that owns the URL.
      if (syncHash) {
        sectionRef.current?.scrollIntoView({
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          block: 'start',
        });
      }
    };

    scrollToHash();
    window.addEventListener('hashchange', scrollToHash);
    return () => window.removeEventListener('hashchange', scrollToHash);
  }, [emblaApi, syncHash]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    onSelect(); // initialize state (runs after the deep-link jump above)
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const current = SYSTEM_DESIGNS[selectedIndex];

  return (
    <section
      ref={sectionRef}
      aria-roledescription="carousel"
      aria-label={heading ?? 'System design diagrams'}
    >
      {(heading || subheading) && (
        <header className="mb-6 max-w-3xl">
          {heading && (
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {heading}
            </h2>
          )}
          {subheading && (
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {subheading}
            </p>
          )}
        </header>
      )}

      {/* Counter */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-micro text-zinc-400 font-mono">
          {selectedIndex + 1} / {SYSTEM_DESIGNS.length}
        </span>
      </div>

      {/* Embla viewport */}
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {SYSTEM_DESIGNS.map((design, index) => (
            <div
              key={design.projectId}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${SYSTEM_DESIGNS.length}: ${design.title}`}
              className="flex-[0_0_100%] min-w-0 pr-0.5"
            >
              <SystemDesignDiagram design={design} />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-4">
        <button
          onClick={() => emblaApi?.scrollPrev()}
          disabled={!canScrollPrev}
          aria-label="Previous system design"
          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200
                     disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Dot indicators */}
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          {SYSTEM_DESIGNS.map((design, index) => (
            <button
              key={design.projectId}
              onClick={() => emblaApi?.scrollTo(index)}
              aria-label={`Go to ${design.title}`}
              aria-current={index === selectedIndex}
              className={`rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                index === selectedIndex
                  ? 'w-4 h-1.5 bg-blue-600 dark:bg-blue-400'
                  : 'w-1.5 h-1.5 bg-zinc-300 dark:bg-zinc-600 hover:bg-zinc-400'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => emblaApi?.scrollNext()}
          disabled={!canScrollNext}
          aria-label="Next system design"
          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200
                     disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Screen-reader live announcement of the current slide */}
      <p aria-live="polite" className="sr-only">
        {current
          ? `Showing ${selectedIndex + 1} of ${SYSTEM_DESIGNS.length}: ${current.title}`
          : ''}
      </p>
    </section>
  );
};

export default SystemDesignCarousel;
