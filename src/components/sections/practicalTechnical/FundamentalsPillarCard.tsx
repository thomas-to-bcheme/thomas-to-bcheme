import Badge from '@/components/ui/Badge';
import type { FundamentalsPillar, InterviewMode } from '@/constants/practicalTechnical';

interface FundamentalsPillarCardProps {
  pillar: FundamentalsPillar;
}

const MODE_BADGE_COLOR: Record<InterviewMode, 'blue' | 'purple'> = {
  synchronous: 'blue',
  asynchronous: 'purple',
};

const MODE_BADGE_LABEL: Record<InterviewMode, string> = {
  synchronous: 'Synchronous',
  asynchronous: 'Asynchronous',
};

/**
 * Presentational card for one of the two fundamentals pillars
 * (programming fundamentals / agentic CLI tool fundamentals). Pure UI —
 * depends only on the `pillar` prop, no global state.
 */
const FundamentalsPillarCard = ({ pillar }: FundamentalsPillarCardProps) => (
  <div className="card-base p-5 sm:p-6">
    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{pillar.label}</h3>
    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
      {pillar.description}
    </p>

    <ul className="mt-4 space-y-1.5">
      {pillar.topics.map((topic) => (
        <li
          key={topic}
          className="text-sm text-zinc-600 dark:text-zinc-300 pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-zinc-400 dark:before:text-zinc-600"
        >
          {topic}
        </li>
      ))}
    </ul>

    <div className="mt-5 flex flex-wrap gap-2">
      {pillar.supportsMode.map((mode) => (
        <Badge key={mode} color={MODE_BADGE_COLOR[mode]} variant="outline">
          {MODE_BADGE_LABEL[mode]}
        </Badge>
      ))}
    </div>
  </div>
);

export default FundamentalsPillarCard;
