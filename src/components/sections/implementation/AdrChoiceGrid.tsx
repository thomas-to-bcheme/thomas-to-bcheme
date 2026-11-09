import { BODY_TEXT_CLASS } from '@/components/sections/sweDe/styles';
import { ADR_CHOICES, getLanguageName } from '@/constants/implementation';

/** The workload-to-language decision cards. Driven entirely by ADR_CHOICES. */
const AdrChoiceGrid = () => (
  <div className="grid gap-4 md:grid-cols-2">
    {ADR_CHOICES.map((choice) => (
      <article key={choice.id} className="card-base p-5">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{choice.question}</h3>
        <p className="mt-1 text-micro font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400">
          {choice.languageIds.map(getLanguageName).join(' · ')}
        </p>
        <dl className={`mt-3 space-y-2 ${BODY_TEXT_CLASS}`}>
          <div>
            <dt className="font-semibold text-zinc-900 dark:text-white">Reach for</dt>
            <dd>{choice.reach}</dd>
          </div>
          <div>
            <dt className="font-semibold text-zinc-900 dark:text-white">Because</dt>
            <dd>{choice.because}</dd>
          </div>
          <div>
            <dt className="font-semibold text-zinc-900 dark:text-white">Look elsewhere when</dt>
            <dd>{choice.avoidWhen}</dd>
          </div>
        </dl>
      </article>
    ))}
  </div>
);

export default AdrChoiceGrid;
