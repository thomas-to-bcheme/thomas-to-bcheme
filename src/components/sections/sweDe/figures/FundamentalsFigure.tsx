import type { ReactNode } from 'react';
import FoundationsSourceLink from '@/components/sections/systemDesignPrep/foundations/FoundationsSourceLink';
import type { BookId } from '@/constants/sweDe';
import BookLink from '../BookLink';

interface FundamentalsFigureProps {
  /** Anchor id for deep links. */
  id: string;
  /** Accessible name for the diagram body — read aloud instead of every box. */
  label: string;
  caption: string;
  sourceIds?: string[];
  bookIds?: BookId[];
  children: ReactNode;
}

/**
 * Shared frame for every /swe-de figure: the diagram sits in a labelled group
 * and the caption carries its citations — official sources by EXTERNAL_REFERENCES
 * id, books by registry id — so a figure can't cite something that isn't registered
 * (scripts/verifySweDe.ts checks both).
 */
const FundamentalsFigure = ({ id, label, caption, sourceIds = [], bookIds = [], children }: FundamentalsFigureProps) => (
  <figure id={id} className="card-base p-4 sm:p-6 scroll-mt-28">
    <div role="group" aria-label={label}>
      {children}
    </div>
    <figcaption className="mt-4 space-y-1.5 text-center text-xs text-zinc-500 dark:text-zinc-400">
      <p>{caption}</p>
      {(sourceIds.length > 0 || bookIds.length > 0) && (
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          {sourceIds.map((sourceId) => (
            <FoundationsSourceLink key={sourceId} referenceId={sourceId} />
          ))}
          {bookIds.map((bookId) => (
            <BookLink key={bookId} bookId={bookId} className="text-xs" />
          ))}
        </p>
      )}
    </figcaption>
  </figure>
);

export default FundamentalsFigure;
