import React from 'react';
import type { StakeholderArchetype } from '@/constants/effectiveCommunication';

interface StakeholderArchetypeCardProps {
  archetype: StakeholderArchetype;
}

const BULLET_CLASS =
  "text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-4 relative before:content-['—'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700";

/**
 * Scannable-at-a-glance stakeholder reference card — intentionally not an
 * accordion, since this is meant to be read in full rather than progressively
 * disclosed. One card per archetype (engineer peer, PM, executive,
 * cross-functional partner).
 */
const StakeholderArchetypeCard = ({ archetype }: StakeholderArchetypeCardProps) => (
  <div className="card-base p-5 sm:p-6">
    <h3 className="text-base font-bold text-zinc-900 dark:text-white">{archetype.archetype}</h3>

    <span className="text-micro text-zinc-400 block mt-4 mb-2">What they care about</span>
    <ul className="space-y-1.5">
      {archetype.whatTheyCareAbout.map((point) => (
        <li key={point} className={BULLET_CLASS}>
          {point}
        </li>
      ))}
    </ul>

    <span className="text-micro text-zinc-400 block mt-4 mb-2">How to adapt</span>
    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
      {archetype.howToAdaptCommunication}
    </p>

    <span className="text-micro text-zinc-400 block mt-4 mb-2">Ask yourself</span>
    <ul className="space-y-1.5">
      {archetype.questionsToAsk.map((question) => (
        <li key={question} className={BULLET_CLASS}>
          {question}
        </li>
      ))}
    </ul>
  </div>
);

export default StakeholderArchetypeCard;
