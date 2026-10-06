import Badge from '@/components/ui/Badge';
import { LIFECYCLE_STAGES } from '@/constants/deployOps/lifecycle';
import type { BookBasis, DeployOpsBook } from '@/constants/deployOps/types';
import { BODY_TEXT_CLASS } from '@/components/sections/sweDe/styles';
import BookLink from './BookLink';

const BASIS_LABEL: Record<BookBasis, string> = {
  toc: 'the table of contents',
  'publisher-description': 'the publisher description',
  'author-repo': 'the author’s repo outline',
  'established-reputation': 'the book’s published scope and reputation',
};

const STAGE_LABELS = new Map(LIFECYCLE_STAGES.map((stage) => [stage.id, stage.label]));

interface BookCardProps {
  book: DeployOpsBook;
}

/**
 * One reading-list entry: why read it, which lifecycle stages it serves, and
 * three takeaways labelled with where they came from (none is read from the
 * book text).
 */
const BookCard = ({ book }: BookCardProps) => (
  <article className="card-base p-4 flex flex-col gap-3">
    <header className="space-y-1.5">
      <BookLink bookId={book.id} className="text-sm" />
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {book.authors.join(', ')}
        {book.year !== null ? ` · ${book.year}` : ''}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <Badge color="zinc" variant="outline">{book.publisher}</Badge>
        {book.status === 'early-release' && (
          <Badge color="amber" variant="outline">Early release</Badge>
        )}
        {!book.isCoreList && <Badge color="purple" variant="outline">Added to fill a gap</Badge>}
      </div>
    </header>

    <p className={BODY_TEXT_CLASS}>{book.whyRead}</p>

    <div className="flex flex-wrap gap-1.5" aria-label="Lifecycle stages served">
      {book.stageIds.map((stageId) => (
        <span key={stageId} className="tag-blue">
          {STAGE_LABELS.get(stageId) ?? stageId}
        </span>
      ))}
    </div>

    <ol className={`list-decimal pl-5 space-y-1 ${BODY_TEXT_CLASS}`}>
      {book.takeaways.map((takeaway) => (
        <li key={takeaway}>{takeaway}</li>
      ))}
    </ol>

    <p className="mt-auto text-xs text-zinc-500 dark:text-zinc-500">
      {`Takeaways are inferred from ${BASIS_LABEL[book.basis]}, not from the book text. Confidence: ${book.confidence}.`}
      {book.isbn13 !== null ? ` ISBN ${book.isbn13}.` : ''}
      {book.note ? ` ${book.note}` : ''}
    </p>
  </article>
);

export default BookCard;
