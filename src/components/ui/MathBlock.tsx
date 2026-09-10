import katex from 'katex';

import { cn } from '@/lib/utils';

interface MathBlockProps {
  /** KaTeX body only, no $ delimiters. */
  math: string;
  /** Block (default) or inline rendering. */
  display?: boolean;
  className?: string;
}

/**
 * Server-rendered KaTeX.
 *
 * Deliberately does NOT use react-katex: that package calls useMemo and ships no
 * 'use client' directive, so <BlockMath> throws inside a server component. Its
 * two existing consumers only work because ROICalculation.tsx is a client
 * component. Calling katex.renderToString directly keeps this a server
 * component, which means zero client JS for math across every model page and
 * formulas present in the HTML for SEO.
 *
 * dangerouslySetInnerHTML is safe here: the input is author-controlled repo
 * constants, never user input.
 *
 * throwOnError is false so one bad TeX string renders a visible inline error
 * rather than failing the whole build; scripts/verifyAiMl.ts runs the same
 * strings through the same renderer with throwOnError true, so CI catches it
 * first. katex.min.css is already imported globally in src/app/layout.tsx.
 */
const MathBlock = ({ math, display = true, className }: MathBlockProps) => {
  const html = katex.renderToString(math, {
    displayMode: display,
    throwOnError: false,
    output: 'html',
  });

  return (
    <div
      role="math"
      aria-label={math}
      // KaTeX does not wrap, so a long expression must be able to scroll.
      className={cn(display && 'overflow-x-auto py-2', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default MathBlock;
