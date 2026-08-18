import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';
import {
  DEVELOPMENT_LIFECYCLES,
  LIFECYCLE_SYNTHESIS_STEPS,
} from '@/constants/systemDesignPrep/developmentLifecycles';
import { EXTERNAL_REFERENCES } from '@/constants/systemDesignPrep/externalReferences';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1';

/**
 * Background on the 4 named engineering lifecycles this page's stage
 * ordering and Model/Ops framing are read against (SDLC, Data Engineering,
 * ML/MLOps, DevOps) — each already cited in Sources below, promoted here
 * from a one-line citation blurb into real stage-by-stage depth — followed
 * by the closing synthesis: one lifecycle-agnostic pattern all 4 repeat,
 * the guiding mental model this page's own SWE Compass (see /projects) is
 * one concrete instance of.
 */
const DevelopmentLifecyclesSection = () => (
  <section id="development-lifecycles" className="scroll-mt-24 mt-20">
    <SectionHeading eyebrow="Reference" title="The lifecycles underneath the lifecycle" />
    <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-8">
      This page&apos;s Design→Ops ordering isn&apos;t invented — it&apos;s one instance of a pattern
      that shows up, under different names, in every engineering discipline that ships something.
      Four of those named lifecycles, in their own real stages, then the pattern underneath all of
      them.
    </p>

    <div className="grid gap-4 sm:grid-cols-2">
      {DEVELOPMENT_LIFECYCLES.map((lifecycle) => {
        const Icon = lifecycle.icon;
        const reference = EXTERNAL_REFERENCES.find((candidate) => candidate.id === lifecycle.sourceReferenceId);
        return (
          <div key={lifecycle.id} className="card-base p-5">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} className="stroke-[2.5] text-blue-600 dark:text-blue-400 shrink-0" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{lifecycle.label}</h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-500 leading-relaxed mb-3">{lifecycle.summary}</p>
            <ol className="space-y-1.5">
              {lifecycle.stages.map((stage, index) => (
                <li key={stage.label} className="flex gap-2">
                  <span className="text-xs font-bold text-zinc-300 dark:text-zinc-700 shrink-0">
                    {index + 1}
                  </span>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{stage.label}</span>
                    {' — '}
                    {stage.summary}
                  </p>
                </li>
              ))}
            </ol>
            {lifecycle.crossCuttingConcerns && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {lifecycle.crossCuttingConcerns.map((concern) => (
                  <span
                    key={concern}
                    className="text-micro font-semibold text-zinc-400 dark:text-zinc-600 rounded-full border border-zinc-100 dark:border-zinc-800 px-2 py-0.5"
                  >
                    {concern} (continuous)
                  </span>
                ))}
              </div>
            )}
            {reference && (
              <a
                href={reference.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline rounded-sm ${FOCUS_RING}`}
              >
                Source: {reference.title} <ExternalLink size={11} className="stroke-[2.5]" aria-hidden="true" />
              </a>
            )}
          </div>
        );
      })}
    </div>

    <div className="card-base p-5 sm:p-6 mt-6">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">The pattern underneath all 4</h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-500 leading-relaxed mb-4">
        Strip the domain-specific vocabulary away and the same 6 steps recur — the mental model to
        reach for once the specific lifecycle&apos;s own naming stops mattering.
      </p>
      <div className="space-y-4">
        {LIFECYCLE_SYNTHESIS_STEPS.map((step) => (
          <div key={step.id} className="rounded-lg border border-zinc-100 dark:border-zinc-800 p-3">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">{step.label}</p>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-500 leading-relaxed">{step.summary}</p>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {step.mappings.map((mapping) => {
                const lifecycle = DEVELOPMENT_LIFECYCLES.find((candidate) => candidate.id === mapping.lifecycleId);
                if (!lifecycle) return null;
                return (
                  <p key={mapping.lifecycleId} className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    <span className="font-semibold text-zinc-500 dark:text-zinc-500">{lifecycle.shortLabel}:</span>{' '}
                    {mapping.stageLabel}
                  </p>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        None of the 4 lifecycles above name a discrete &quot;Learn / iterate&quot; stage — each loops
        back implicitly instead.{' '}
        <Link
          href="/projects#swe-compass-time"
          className={`font-semibold text-blue-700 dark:text-blue-400 hover:underline rounded-sm ${FOCUS_RING}`}
        >
          The SWE Compass&apos;s Time axis
        </Link>{' '}
        is this site&apos;s own concrete version of that step made explicit — a dated, per-release
        record of what shipped, what broke, and what got learned, in that order.
      </p>
    </div>
  </section>
);

export default DevelopmentLifecyclesSection;
