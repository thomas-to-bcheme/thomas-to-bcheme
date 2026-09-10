import { LANGUAGE_STANDARDS } from '@/constants/aiMl/languageStandards';
import { AI_ML_LANGUAGES } from '@/constants/aiMl/types';

const LIST_ITEM_CLASS =
  "text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700";

/**
 * The per-language definition of "idiomatic" and "optimized", stated once.
 *
 * Every model's code progression is authored against these lists, and
 * scripts/verifyAiMl.ts checks each sample's `conventions` and
 * `optimizations[].technique` against them — a closed vocabulary rather than
 * free text. Publishing the vocabulary here is what makes the check legible to
 * a reader rather than an invisible lint rule.
 */
const LanguageStandardsPanel = () => (
  <div className="grid gap-4 lg:grid-cols-3">
    {AI_ML_LANGUAGES.map((language) => {
      const standard = LANGUAGE_STANDARDS[language.id];
      return (
        <div key={language.id} className="card-base p-4 sm:p-5">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{standard.label}</h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{standard.styleGuide}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {standard.tooling.map((tool) => (
              <span key={tool} className="tag-blue font-mono">
                {tool}
              </span>
            ))}
          </div>

          <div className="mt-4">
            <span className="text-micro text-zinc-400 block mb-1.5">
              Conventions — what &ldquo;idiomatic&rdquo; means here
            </span>
            <ul className="space-y-1.5">
              {standard.conventions.map((item) => (
                <li key={item} className={LIST_ITEM_CLASS}>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4">
            <span className="text-micro text-zinc-400 block mb-1.5">
              Optimization levers — what &ldquo;optimized&rdquo; may claim
            </span>
            <ul className="space-y-1.5">
              {standard.optimizationLevers.map((item) => (
                <li key={item} className={LIST_ITEM_CLASS}>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4">
            <span className="text-micro text-zinc-400 block mb-1.5">Anti-patterns</span>
            <ul className="space-y-1.5">
              {standard.antiPatterns.map((item) => (
                <li key={item} className={LIST_ITEM_CLASS}>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">
            Numeric: {standard.ecosystem.numeric} · ML: {standard.ecosystem.ml}
          </p>
        </div>
      );
    })}
  </div>
);

export default LanguageStandardsPanel;
