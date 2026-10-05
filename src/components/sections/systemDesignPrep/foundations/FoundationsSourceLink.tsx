import { ExternalLink } from 'lucide-react';
import { EXTERNAL_REFERENCES } from '@/constants/systemDesignPrep/externalReferences';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1';

interface FoundationsSourceLinkProps {
  referenceId: string;
}

/**
 * "Source: …" citation, looked up by id in externalReferences.ts at render
 * time (same as DevelopmentLifecyclesSection) so title/url live in one place.
 * Renders nothing for an unknown id rather than a broken link.
 */
const FoundationsSourceLink = ({ referenceId }: FoundationsSourceLinkProps) => {
  const reference = EXTERNAL_REFERENCES.find((candidate) => candidate.id === referenceId);
  if (!reference) return null;

  return (
    <a
      href={reference.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline rounded-sm ${FOCUS_RING}`}
    >
      Source: {reference.title} <ExternalLink size={11} className="stroke-[2.5]" aria-hidden="true" />
    </a>
  );
};

export default FoundationsSourceLink;
