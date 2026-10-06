import FoundationsAccordion from '@/components/sections/systemDesignPrep/foundations/FoundationsAccordion';
import type { TermDefinition } from '@/constants/deployOps/types';
import { BODY_TEXT_CLASS } from '@/components/sections/sweDe/styles';

interface KeyTermsProps {
  id: string;
  terms: TermDefinition[];
}

/** Collapsed-by-default glossary of the terms a page uses, so none is left undefined. */
const KeyTerms = ({ id, terms }: KeyTermsProps) => (
  <FoundationsAccordion
    id={id}
    title={`Key terms (${terms.length})`}
    summary="Plain-English definitions of the vocabulary used on this page."
  >
    <dl className="grid gap-x-8 gap-y-3 md:grid-cols-2">
      {terms.map((term) => (
        <div key={term.id}>
          <dt className="text-sm font-semibold text-zinc-900 dark:text-white">{term.term}</dt>
          <dd className={BODY_TEXT_CLASS}>{term.definition}</dd>
        </div>
      ))}
    </dl>
  </FoundationsAccordion>
);

export default KeyTerms;
