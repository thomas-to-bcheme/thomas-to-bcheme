import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBookById, getOreillyUrl, type BookId } from '@/constants/sweDe';
import { FOCUS_RING } from './styles';

interface BookLinkProps {
  bookId: BookId;
  className?: string;
}

/**
 * Inline citation of a registry book: its title linked to O'Reilly, or plain
 * text while the listing is pending. Renders nothing for an unknown id
 * (scripts/verifySweDe.ts guarantees every cited id resolves).
 */
const BookLink = ({ bookId, className }: BookLinkProps) => {
  const book = getBookById(bookId);
  if (book === null) return null;

  const url = getOreillyUrl(book);
  const label = book.edition ? `${book.title} (${book.edition})` : book.title;
  if (url === null) {
    return <span className={cn('font-semibold text-zinc-700 dark:text-zinc-300', className)}>{label}</span>;
  }
  return (
    <a
      href={url}
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
