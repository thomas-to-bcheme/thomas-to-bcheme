import { ExternalLink } from 'lucide-react';

import { cn } from '@/lib/utils';
import { getBookById } from '@/constants/deployOps/books';
import type { BookId } from '@/constants/deployOps/types';
import { FOCUS_RING } from '@/components/sections/sweDe/styles';

interface BookLinkProps {
  bookId: BookId;
  className?: string;
}

/**
 * Inline citation of a registry book: its title linked to the publisher, or
 * plain text when no publisher URL is confirmed. Renders nothing for an
 * unknown id (scripts/verifyDeployOps.ts guarantees every cited id resolves).
 */
const BookLink = ({ bookId, className }: BookLinkProps) => {
  const book = getBookById(bookId);
  if (book === null) return null;

  const label = book.edition ? `${book.title} (${book.edition})` : book.title;
  if (book.url === null) {
    return <span className={cn('font-semibold text-zinc-700 dark:text-zinc-300', className)}>{label}</span>;
  }
  return (
    <a
      href={book.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-400 hover:underline rounded-sm',
        FOCUS_RING,
        className,
      )}
    >
      {label}
      <ExternalLink size={11} className="shrink-0" aria-hidden />
    </a>
  );
};

export default BookLink;
