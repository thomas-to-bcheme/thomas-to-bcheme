import { ArrowRight, CircleCheck, CircleAlert } from 'lucide-react';
import { Fragment } from 'react';
import { ORIGINAL_STARTING_PATH, PATH_ASSESSMENT, type AssessmentVerdict } from '@/constants/sweDe';
import BookLink from './BookLink';
import { BODY_TEXT_CLASS } from './styles';

const VERDICT_STYLES: Record<AssessmentVerdict, { label: string; className: string; Icon: typeof CircleCheck }> = {
  keeps: { label: 'Keep', className: 'text-emerald-700 dark:text-emerald-400', Icon: CircleCheck },
  gap: { label: 'Gap', className: 'text-amber-700 dark:text-amber-400', Icon: CircleAlert },
};

/** The commonly-shared starting path, then what it gets right and what it misses. */
const PathAssessment = () => (
  <div className="space-y-5">
    <div className="card-base p-4">
      <span className="text-micro text-zinc-400 block mb-2">The path being assessed</span>
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-zinc-700 dark:text-zinc-300">
        {ORIGINAL_STARTING_PATH.map((title, position) => (
          <Fragment key={title}>
            {position > 0 && <ArrowRight size={13} className="text-zinc-400 shrink-0" aria-hidden />}
            <span>{title}</span>
          </Fragment>
        ))}
      </p>
    </div>

    <ul className="grid gap-3 md:grid-cols-2">
      {PATH_ASSESSMENT.map((item) => {
        const verdict = VERDICT_STYLES[item.verdict];
        return (
          <li key={item.id} className="card-base p-4 space-y-2">
            <p className={`flex items-center gap-1.5 text-micro font-bold uppercase tracking-wider ${verdict.className}`}>
              <verdict.Icon size={13} aria-hidden /> {verdict.label}
            </p>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{item.title}</h3>
            <p className={BODY_TEXT_CLASS}>{item.detail}</p>
            <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {item.bookIds.map((bookId) => (
                <BookLink key={bookId} bookId={bookId} className="text-xs" />
              ))}
            </p>
          </li>
        );
      })}
    </ul>
  </div>
);

export default PathAssessment;
