'use client';

import Tabs from '@/components/ui/Tabs';
import { BODY_TEXT_CLASS } from '@/components/sections/sweDe/styles';
import type { LanguageTraits } from '@/constants/implementation/concepts/types';
import CodeBlock from './CodeBlock';

interface LanguageOption {
  id: string;
  name: string;
}

interface TraitsExplorerProps {
  traits: LanguageTraits[];
  languages: LanguageOption[];
}

/**
 * Language first: pick a language, then read each of its defining traits with
 * a runnable-looking example. Data arrives as props from the server page.
 */
const TraitsExplorer = ({ traits, languages }: TraitsExplorerProps) => {
  const tabs = traits
    .map((entry) => languages.find((language) => language.id === entry.languageId))
    .filter((language): language is LanguageOption => language !== undefined)
    .map((language) => ({ id: language.id, label: language.name }));

  return (
    <Tabs tabs={tabs} label="Language-specific traits">
      {(languageId) => {
        const entry = traits.find((candidate) => candidate.languageId === languageId);
        const language = languages.find((candidate) => candidate.id === languageId);
        if (!entry || !language) return null;
        return (
          <div className="space-y-6">
            {entry.traits.map((trait) => (
              <article key={trait.id}>
                <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                  {trait.title}
                </h3>
                <p className={`mt-1 mb-3 max-w-3xl ${BODY_TEXT_CLASS}`}>{trait.summary}</p>
                <CodeBlock
                  snippet={{
                    language: language.name,
                    caption: trait.snippet.note ?? '',
                    code: trait.snippet.code,
                  }}
                />
              </article>
            ))}
          </div>
        );
      }}
    </Tabs>
  );
};

export default TraitsExplorer;
