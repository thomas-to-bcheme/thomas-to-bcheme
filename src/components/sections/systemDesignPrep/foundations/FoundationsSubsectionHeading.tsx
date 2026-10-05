import FoundationsSourceLink from './FoundationsSourceLink';

interface FoundationsSubsectionHeadingProps {
  eyebrow: string;
  title: string;
  intro: string;
  referenceId: string;
}

/** Shared h3 + intro + citation header for the 3 Foundations sub-sections. */
const FoundationsSubsectionHeading = ({ eyebrow, title, intro, referenceId }: FoundationsSubsectionHeadingProps) => (
  <div className="mb-5">
    <span className="text-micro text-zinc-400 block mb-1">{eyebrow}</span>
    <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">{title}</h3>
    <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{intro}</p>
    <div className="mt-2">
      <FoundationsSourceLink referenceId={referenceId} />
    </div>
  </div>
);

export default FoundationsSubsectionHeading;
