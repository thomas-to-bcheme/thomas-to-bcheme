interface CodeBlockProps {
  code: string;
}

/**
 * Minimal styled code snippet — no syntax-highlighting dependency, matching
 * the inline-<code> convention already used sitewide (font-mono +
 * bg-zinc-100/dark:bg-zinc-800), extended for multi-line blocks.
 */
const CodeBlock = ({ code }: CodeBlockProps) => (
  <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 overflow-hidden">
    <pre className="overflow-x-auto p-3 text-xs sm:text-[13px] leading-relaxed">
      <code className="font-mono text-zinc-800 dark:text-zinc-200">{code}</code>
    </pre>
  </div>
);

export default CodeBlock;
