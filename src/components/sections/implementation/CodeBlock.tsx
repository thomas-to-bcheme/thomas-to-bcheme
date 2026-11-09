import type { CodeSnippet } from '@/constants/implementation';

import { BODY_TEXT_CLASS } from '@/components/sections/sweDe/styles';

interface CodeBlockProps {
  snippet: CodeSnippet;
}

/** A captioned code listing. Scrolls horizontally instead of wrapping, so indentation survives. */
const CodeBlock = ({ snippet }: CodeBlockProps) => (
  <figure className="card-base overflow-hidden">
    <figcaption className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-zinc-100 dark:border-zinc-900 px-4 py-2">
      <span className="text-micro font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400">
        {snippet.language}
      </span>
      <span className={BODY_TEXT_CLASS}>{snippet.caption}</span>
    </figcaption>
    <pre
      tabIndex={0}
      className="overflow-x-auto px-4 py-3 text-xs leading-relaxed font-mono text-zinc-800 dark:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <code>{snippet.code}</code>
    </pre>
  </figure>
);

export default CodeBlock;
