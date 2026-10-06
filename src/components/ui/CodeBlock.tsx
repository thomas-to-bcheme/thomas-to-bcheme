interface CodeBlockProps {
  code: string;
  /** Optional filename or label shown in a header bar above the code. */
  title?: string;
}

/**
 * Minimal styled code snippet — no syntax-highlighting dependency, matching
 * the inline-<code> convention already used sitewide (font-mono +
 * bg-zinc-100/dark:bg-zinc-800), extended for multi-line blocks.
 */
const CodeBlock = ({ code, title }: CodeBlockProps) => (
  <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 overflow-hidden">
    {title && (
      <div className="border-b border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-xs font-mono text-zinc-500 dark:text-zinc-400">
        {title}
      </div>
    )}
    <pre className="overflow-x-auto p-3 text-xs sm:text-[13px] leading-relaxed">
      <code className="font-mono text-zinc-800 dark:text-zinc-200">{code}</code>
    </pre>
  </div>
);

export default CodeBlock;
