'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * useActiveSection - Custom hook for tracking active section in viewport (U2)
 * Uses IntersectionObserver to detect which section is currently visible
 *
 * @param sectionIds - Array of section IDs to observe
 * @param options - IntersectionObserver options
 * @returns The ID of the currently active section
 */
export function useActiveSection(
  sectionIds: string[],
  options: { threshold?: number; rootMargin?: string } = {}
): string | null {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Debounce timer ref to prevent rapid state updates
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const { threshold = 0.3, rootMargin = '-20% 0px -60% 0px' } = options;

    // Track which sections are visible and their intersection ratios
    const visibleSections = new Map<string, number>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.id;
          if (entry.isIntersecting) {
            visibleSections.set(id, entry.intersectionRatio);
          } else {
            visibleSections.delete(id);
          }
        });

        // Debounce the state update
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
          // Find the section with the highest intersection ratio
          let maxRatio = 0;
          let mostVisible: string | null = null;

          visibleSections.forEach((ratio, id) => {
            if (ratio > maxRatio) {
              maxRatio = ratio;
              mostVisible = id;
            }
          });

          // If no sections are visible, keep the last active section
          if (mostVisible !== null) {
            setActiveSection(mostVisible);
          }
        }, 100); // 100ms debounce
      },
      {
        threshold: [0, threshold, 0.5, 1],
        rootMargin,
      }
    );

    // Observe all sections
    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element && observerRef.current) {
        observerRef.current.observe(element);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [sectionIds.join(','), options.threshold, options.rootMargin]);

  return activeSection;
}
