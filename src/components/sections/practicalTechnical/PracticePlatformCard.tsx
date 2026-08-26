import Badge from '@/components/ui/Badge';
import type { PracticePlatform } from '@/constants/practicalTechnical';

interface PracticePlatformCardProps {
  platform: PracticePlatform;
}

/**
 * Presentational card for a single practice platform (LeetCode, HackerRank,
 * CoderPad). Pure UI — depends only on the `platform` prop, no global state.
 */
const PracticePlatformCard = ({ platform }: PracticePlatformCardProps) => (
  <div className="card-base p-5 sm:p-6">
    <div className="flex flex-wrap items-center gap-2">
      <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{platform.label}</h3>
      {platform.mostCommon && <Badge color="amber">Most Common</Badge>}
    </div>

    <ul className="mt-4 space-y-1.5">
      {platform.fundamentalsTested.map((fundamental) => (
        <li
          key={fundamental}
          className="text-sm text-zinc-600 dark:text-zinc-300 pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-zinc-400 dark:before:text-zinc-600"
        >
          {fundamental}
        </li>
      ))}
    </ul>

    <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
      {platform.notes}
    </p>
  </div>
);

export default PracticePlatformCard;
