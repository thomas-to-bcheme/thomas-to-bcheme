import { Fragment } from 'react';
import { ArrowRight } from 'lucide-react';
import type { BookId } from '@/constants/sweDe';
import BookLink from './BookLink';

interface BookSequenceProps {
  bookIds: BookId[];
}

/** Books in reading order, separated by arrows. */
const BookSequence = ({ bookIds }: BookSequenceProps) => (
  <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
    {bookIds.map((bookId, position) => (
      <Fragment key={bookId}>
        {position > 0 && <ArrowRight size={13} className="text-zinc-400 shrink-0" aria-hidden />}
        <BookLink bookId={bookId} />
      </Fragment>
    ))}
  </p>
);

export default BookSequence;
