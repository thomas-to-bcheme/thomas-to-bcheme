import React from 'react';
import { FIT_TENSION_AXES } from '@/constants/behavioural/fitTensionAxes';

/**
 * Grid of FIT_TENSION_AXES — each a left↔right spectrum where the same story reads as
 * a strength on one end and a red flag on the other, depending on the company. Static
 * cards (not an accordion) since the left/right pair is the whole point and should be
 * visible without a click.
 */
const MisFitAxesSection = () => (
  <div className="grid gap-4 sm:grid-cols-2">
    {FIT_TENSION_AXES.map((axis) => (
      <div key={axis.id} className="card-base p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-zinc-900 dark:text-white">{axis.left}</span>
          <span className="text-zinc-300 dark:text-zinc-700">&harr;</span>
          <span className="text-sm font-bold text-zinc-900 dark:text-white">{axis.right}</span>
        </div>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{axis.description}</p>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500 leading-relaxed italic">{axis.example}</p>
      </div>
    ))}
  </div>
);

export default MisFitAxesSection;
