import { BOOK_TRACK_LABELS, getOreillyUrl, type OreillyBook } from '@/constants/sweDe';
import BookLink from './BookLink';

interface BookCardProps {
  book: OreillyBook;
}

const formatIdentifier = (book: OreillyBook) =>
  book.isbn13 === null ? `O'Reilly ID ${book.oreillyId}` : `ISBN ${book.isbn13}`;

/** One registry book: citation, metadata, ISBN, and why it is on the path. */
const BookCard = ({ book }: BookCardProps) => {
  const isListed = getOreillyUrl(book) !== null;
  const meta = [book.edition, book.year === null ? 'Early Release' : String(book.year), book.publisher]
    .filter((part): part is string => part !== undefined)
    .join(' · ');

  return (
    <article className="card-base p-4 flex flex-col gap-2">
      <span className="tag-blue self-start">{BOOK_TRACK_LABELS[book.track]}</span>
      <h3 className="text-sm leading-snug">
        <BookLink bookId={book.id} />
      </h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{book.authors.join(', ')}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{meta}</p>
      <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">{formatIdentifier(book)}</p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{book.whyRead}</p>
      {!isListed && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Early access from {book.publisher}; the O&apos;Reilly listing is not live yet.
        </p>
      )}
    </article>
  );
};

export default BookCard;
