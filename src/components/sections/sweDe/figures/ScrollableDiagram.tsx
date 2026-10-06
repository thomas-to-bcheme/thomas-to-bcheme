import type { ReactNode } from 'react';

/**
 * Lets a fixed-aspect SVG keep a readable minimum width on narrow screens by
 * scrolling inside its own box (the page never scrolls sideways), and says so
 * on small screens where the cut-off edge would otherwise go unnoticed.
 */
const ScrollableDiagram = ({ children }: { children: ReactNode }) => (
  <div>
    <div className="overflow-x-auto">{children}</div>
    <p className="mt-1 text-center text-xs text-zinc-400 sm:hidden">Swipe sideways if the diagram is cut off.</p>
  </div>
);

export default ScrollableDiagram;
