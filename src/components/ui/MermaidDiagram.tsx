'use client';

import { useEffect, useRef, useId } from 'react';
import { useSystemTheme } from '@/hooks/useSystemTheme';

interface MermaidDiagramProps {
  /** Raw Mermaid.js diagram source (graph/sequenceDiagram/erDiagram/flowchart, etc). */
  chart: string;
  /** Accessible name for the rendered SVG — mermaid's own output has none. */
  label: string;
}

/**
 * Renders Mermaid.js source as an inline SVG, client-side only — mermaid
 * isn't SSR-safe, so it's dynamically imported here rather than statically,
 * keeping it out of the server bundle entirely. Tracks theme via
 * useSystemTheme() (the same @media prefers-color-scheme hook
 * SystemDesignDiagram/Excalidraw already use for their own canvases) since
 * mermaid's SVG is rendered by its own JS engine and can't pick up
 * Tailwind's dark: variants the way the rest of the page does.
 */
const MermaidDiagram = ({ chart, label }: MermaidDiagramProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const theme = useSystemTheme();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { default: mermaid } = await import('mermaid');
      mermaid.initialize({
        startOnLoad: false,
        theme: theme === 'dark' ? 'dark' : 'default',
        securityLevel: 'strict',
        fontFamily: 'inherit',
      });

      try {
        const { svg } = await mermaid.render(`mermaid-${reactId}`, chart);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (error) {
        if (!cancelled && containerRef.current) {
          containerRef.current.textContent = 'Diagram failed to render.';
        }
        console.error('[MermaidDiagram] render failed', { reactId, error });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chart, reactId, theme]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={label}
      className="mermaid-diagram overflow-x-auto rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-4 [&_svg]:mx-auto"
    />
  );
};

export default MermaidDiagram;
