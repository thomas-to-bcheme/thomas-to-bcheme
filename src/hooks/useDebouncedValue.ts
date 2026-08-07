'use client';

import { useEffect, useState } from 'react';

/**
 * Returns `value`, but only after it has stopped changing for `delayMs`.
 * Generic and delay-configurable by design — no hardcoded timing — so any
 * component needing "wait for the user to pause before acting" (e.g. the Job
 * Board search box, src/components/features/JobFilters.tsx) can reuse it
 * instead of hand-rolling its own setTimeout/clearTimeout dance.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
