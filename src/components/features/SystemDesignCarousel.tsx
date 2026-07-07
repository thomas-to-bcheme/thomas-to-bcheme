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
   * When true, reflect the currently-selected slide back into the URL hash as
   * the user manually navigates the carousel (arrows/dots/drag). Enable only
   * on a dedicated page that owns the URL, so an inline instance never fights
   * it. (Off on the homepage.) Deep-linking to a slide via `#<projectId>` —
   * jumping to it and scrolling it into view — always works regardless of
   * this flag.
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
      // Always reveal the matched slide — a deep link (e.g. from a pipeline
      // project card) is meaningless if the carousel jumps off-screen.
      // `syncHash` separately controls whether *this* instance writes the
      // selected slide back into the URL as the user manually navigates.
      sectionRef.current?.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
      });
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

  // Keyboard nav: ←/→ move between slides when the carousel viewport is focused.
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!emblaApi) return;
      if (event.key === 'ArrowLeft') {
        emblaApi.scrollPrev();
        event.preventDefault();
      } else if (event.key === 'ArrowRight') {
        emblaApi.scrollNext();
        event.preventDefault();
      }
    },
    [emblaApi],
  );

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

      {/* Counter + navigation hint */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-micro text-zinc-400 font-mono">
          {selectedIndex + 1} / {SYSTEM_DESIGNS.length}
        </span>
        <span className="hidden sm:block text-micro text-zinc-400 normal-case tracking-normal font-normal">
          Drag, arrow keys, or dots to navigate
        </span>
      </div>

      {/* Viewport with vertically-centered side arrows sitting in the gutters */}
      <div className="relative px-10 sm:px-14">
        <div
          ref={emblaRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          aria-label="System design diagrams. Use the left and right arrow keys to navigate."
          className="overflow-hidden rounded-xl cursor-grab active:cursor-grabbing select-none
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <div className="flex">
            {SYSTEM_DESIGNS.map((design, index) => (
              <div
                key={design.projectId}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${SYSTEM_DESIGNS.length}: ${design.title}`}
                className="flex-[0_0_100%] min-w-0 px-0.5"
              >
                <SystemDesignDiagram design={design} />
              </div>
            ))}
          </div>
        </div>

        {/* Side arrows */}
        <button
          onClick={() => emblaApi?.scrollPrev()}
          disabled={!canScrollPrev}
          aria-label="Previous system design"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 grid place-items-center h-9 w-9 rounded-full
                     border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm shadow-sm
                     text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-600
                     disabled:opacity-30 disabled:cursor-not-allowed transition
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          onClick={() => emblaApi?.scrollNext()}
          disabled={!canScrollNext}
          aria-label="Next system design"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 grid place-items-center h-9 w-9 rounded-full
                     border border-zinc-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm shadow-sm
                     text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-600
                     disabled:opacity-30 disabled:cursor-not-allowed transition
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Dot indicators */}
      <div className="mt-6 flex items-center justify-center gap-1.5 flex-wrap">
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
