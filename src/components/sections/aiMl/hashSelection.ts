'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Selection shared through the URL hash (`#metric-cosine`, `#genre-regression`).
 *
 * The genre map and the similarity explorer are sibling client components under
 * a server section, so they share no React state. The hash lets either one
 * select something in the other, makes every selection deep-linkable, and keeps
 * working if either component is reused alone.
 *
 * history.replaceState does not fire `hashchange`, so a custom event carries
 * same-page updates. The browser's back stack is left alone, because a dozen
 * slider tweaks should not become a dozen history entries.
 */
const SELECTION_EVENT = 'aiml:hash-selection';

export function selectViaHash(prefix: string, id: string): void {
  window.history.replaceState(null, '', `#${prefix}-${id}`);
  window.dispatchEvent(new Event(SELECTION_EVENT));
}

function readHash<T extends string>(prefix: string, ids: readonly T[]): T | null {
  const marker = `#${prefix}-`;
  const { hash } = window.location;
  if (!hash.startsWith(marker)) return null;
  const candidate = hash.slice(marker.length);
  return ids.find((id) => id === candidate) ?? null;
}

/**
 * Returns the selected id for one prefix. Hashes for other prefixes are
 * ignored, so selecting a metric does not clear the selected genre.
 */
export function useHashSelection<T extends string>(
  prefix: string,
  ids: readonly T[],
  fallback: T,
): [T, (id: T) => void] {
  const [selected, setSelected] = useState<T>(fallback);

  useEffect(() => {
    const sync = () => {
      const fromHash = readHash(prefix, ids);
      if (fromHash !== null) setSelected(fromHash);
    };
    sync();
    window.addEventListener('hashchange', sync);
    window.addEventListener(SELECTION_EVENT, sync);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener(SELECTION_EVENT, sync);
    };
  }, [prefix, ids]);

  const select = useCallback(
    (id: T) => {
      setSelected(id);
      selectViaHash(prefix, id);
    },
    [prefix],
  );

  return [selected, select];
}
