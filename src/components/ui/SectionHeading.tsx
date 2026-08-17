interface SectionHeadingProps {
  eyebrow: string;
  title: string;
}

/**
 * Eyebrow + h2 heading — originally authored for /projects's section family
 * (ChangelogHeaderEssay, ExecutiveSummary), promoted to ui/ once the 4
 * interview-prep pages (Behavioural, Effective Communication, Practical
 * Technical, System Design) needed the identical eyebrow+h2 pattern too.
 * Zero page-specific logic — safe to share verbatim.
 */
const SectionHeading = ({ eyebrow, title }: SectionHeadingProps) => (
  <div className="mb-4">
    <span className="text-micro text-zinc-400 block mb-2">{eyebrow}</span>
    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
      {title}
    </h2>
  </div>
);

export default SectionHeading;
