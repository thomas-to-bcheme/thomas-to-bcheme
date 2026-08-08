interface SectionHeadingProps {
  eyebrow: string;
  title: string;
}

/**
 * Eyebrow + h2 heading used atop every major /changelog section — the 5
 * mental-model essay sections (ChangelogHeaderEssay) and the executive
 * summary (ExecutiveSummary). Extracted so both consumers share one heading
 * language instead of duplicating the same markup twice.
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
