import { BODY_TEXT_CLASS, FOCUS_RING, LINK_CLASS } from '@/components/sections/sweDe/styles';
import { LANGUAGE_ECOSYSTEMS, getLanguageName } from '@/constants/implementation';

const COLUMN_LABEL_CLASS = 'text-micro font-bold uppercase tracking-widest text-zinc-400 mb-1.5';

/**
 * One card per language. A card list (not a wide table) so it reads the same at
 * phone width. Driven entirely by LANGUAGE_ECOSYSTEMS; no per-language branches.
 */
const EcosystemMatrix = () => (
  <div className="space-y-4">
    {LANGUAGE_ECOSYSTEMS.map((entry) => (
      <article
        key={entry.languageId}
        id={`ecosystem-${entry.languageId}`}
        className="card-base p-5 scroll-mt-28"
      >
        <h3 className="text-base font-bold text-zinc-900 dark:text-white">
          {getLanguageName(entry.languageId)}
        </h3>

        <div className="mt-3 grid gap-5 md:grid-cols-3">
          <div>
            <h4 className={COLUMN_LABEL_CLASS}>Native documentation</h4>
            <ul className="space-y-1">
              {entry.nativeDocs.map((doc) => (
                <li key={doc.href} className={BODY_TEXT_CLASS}>
                  <a
                    href={doc.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${LINK_CLASS} rounded-sm ${FOCUS_RING}`}
                  >
                    {doc.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className={COLUMN_LABEL_CLASS}>Standard API</h4>
            <ul className="space-y-1">
              {entry.standardApi.map((item) => (
                <li key={item} className={BODY_TEXT_CLASS}>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className={COLUMN_LABEL_CLASS}>Ecosystem libraries</h4>
            <ul className="space-y-2">
              {entry.libraryGroups.map((group) => (
                <li key={group.role} className={BODY_TEXT_CLASS}>
                  <span className="font-semibold text-zinc-900 dark:text-white">{group.role}: </span>
                  {group.libraries.join(', ')}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className={`mt-4 border-t border-zinc-100 dark:border-zinc-900 pt-3 ${BODY_TEXT_CLASS}`}>
          <span className="font-semibold text-zinc-900 dark:text-white">Architect&apos;s note: </span>
          {entry.architectNote}
        </p>
      </article>
    ))}
  </div>
);

export default EcosystemMatrix;
