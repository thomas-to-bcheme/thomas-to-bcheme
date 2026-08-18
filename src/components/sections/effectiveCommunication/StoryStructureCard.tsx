import React from 'react';
import type { StoryStructureApproach } from '@/constants/effectiveCommunication';

interface StoryStructureCardProps {
  approach: StoryStructureApproach;
}

/**
 * One narrative-order reference card (chronological or reverse-chronological).
 * Story beats render as a NUMBERED sequence, not the dash-bullet list used
 * elsewhere on this page — order is the entire point of this content.
 */
const StoryStructureCard = ({ approach }: StoryStructureCardProps) => (
  <div className="card-base p-5 sm:p-6">
    <h3 className="text-base font-bold text-zinc-900 dark:text-white">{approach.name}</h3>

    <span className="text-micro text-zinc-400 block mt-4 mb-2">The sequence</span>
    <ol className="space-y-2.5">
      {approach.storyBeats.map((beat, index) => (
        <li key={beat} className="flex items-start gap-2.5">
          <span className="mt-0.5 w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-bold flex items-center justify-center shrink-0">
            {index + 1}
          </span>
          <span className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{beat}</span>
        </li>
      ))}
    </ol>

    <span className="text-micro text-zinc-400 block mt-4 mb-2">Best for</span>
    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{approach.bestFor}</p>
  </div>
);

export default StoryStructureCard;
