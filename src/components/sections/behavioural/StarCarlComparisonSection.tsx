import React from 'react';
import FrameworkStepList from '@/components/ui/FrameworkStepList';
import { STAR_FRAMEWORK, U_SHAPED_NARRATIVE } from '@/constants/behavioural/starFramework';
import { HSS_VS_STAR_CARL_MAPPING } from '@/constants/behavioural/hss';

/**
 * "If you already know STAR" — a comparison reference rendered directly after
 * `HighSignalStorytellingSection`, not a competing framework. STAR and the
 * U-shaped delivery arc are reused unchanged from `starFramework.ts` (no
 * longer this page's hero framework — see that file's own doc comment), and
 * `HSS_VS_STAR_CARL_MAPPING` (defined alongside HSS in `hss.ts`, since it's
 * fundamentally an HSS-shaped view of STAR/CARL rather than the reverse) does
 * the actual conversion work: what each STAR/CARL element becomes once it's
 * rebuilt as a pyramid.
 */
const StarCarlComparisonSection = () => (
  <div className="mt-12">
    <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">If you already know STAR, here&apos;s how it maps</h3>
    <p className="mb-4 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
      STAR isn&apos;t wrong so much as it&apos;s slow: Situation and Task are supposed to be brief
      scaffolding, but in practice they eat the clock before Action — the part interviewers actually
      weight most heavily — ever shows up, and forcing a distinct &ldquo;Task&rdquo; onto a
      self-initiated or senior-level story often makes it sound artificial. CARL&apos;s answer to
      STAR's other gap adds a mandatory &ldquo;Learning&rdquo; close, but that ending is generic by
      construction — it forces some kind of insight out of every story even in cases where landing on
      the metric or result would be the stronger, more confident way to finish. HSS keeps what both
      frameworks get right about content while fixing the pacing: nothing below is new information,
      it&apos;s the same ingredients, reordered around what an interviewer actually needs first.
    </p>

    <FrameworkStepList steps={STAR_FRAMEWORK} />

    <div className="mt-8">
      <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">The U-shaped delivery arc</h4>
      <p className="mb-4 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        Independent of STAR&apos;s content structure, this is a shape for the telling itself — and it
        still applies inside an HSS Behavioral Core exactly as it does inside a STAR Result: open at
        the right altitude, go through a real dip, and close on a win that isn&apos;t artificially
        clean.
      </p>
      <FrameworkStepList steps={U_SHAPED_NARRATIVE} />
    </div>

    <div className="mt-8">
      <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">Where each piece lands in HSS</h4>
      <div className="card-base p-4 sm:p-5">
        <div className="space-y-3">
          {HSS_VS_STAR_CARL_MAPPING.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-1 sm:grid-cols-[minmax(0,11rem)_1fr] gap-1.5 sm:gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-3 last:border-0 last:pb-0"
            >
              <span className="text-sm font-bold text-zinc-900 dark:text-white">{row.starOrCarlElement}</span>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{row.hssEquivalent}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default StarCarlComparisonSection;
