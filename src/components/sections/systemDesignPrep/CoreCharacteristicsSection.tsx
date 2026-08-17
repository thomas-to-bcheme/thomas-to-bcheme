import Link from 'next/link';
import { cn } from '@/lib/utils';
import SectionHeading from '@/components/ui/SectionHeading';
import {
  CORE_CHARACTERISTICS,
  SITUATIONAL_CHARACTERISTICS,
  type CoreCharacteristic,
} from '@/constants/systemDesignPrep/coreCharacteristics';

const EXTERNAL_LINK_CLASS = 'font-semibold text-blue-700 dark:text-blue-400 hover:underline';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1';

const SOURCE_GROUP_LABELS: Record<CoreCharacteristic['source'], string> = {
  huyen: "Chip Huyen's 4",
  cap: "CAP's 3",
};

const groupBySource = (source: CoreCharacteristic['source']) =>
  CORE_CHARACTERISTICS.filter((characteristic) => characteristic.source === source);

/**
 * The foundational system-quality framework rendered right after the compass
 * intro — Chip Huyen's 4 canonical characteristics (Designing Machine
 * Learning Systems, O'Reilly 2022) plus CAP theorem's 3, the baseline every
 * decision cascade in the question bank below gets checked against. The
 * situational list underneath reuses SystemDesignQuestionCard's exact
 * ripple-chip pattern (tag-blue + anchor link) rather than inventing a new
 * chip style, and cross-links each entry to the real question-bank id where
 * that trade-off gets worked through.
 */
const CoreCharacteristicsSection = () => (
  <section id="core-characteristics" className="scroll-mt-24 mt-16">
    <SectionHeading eyebrow="Foundation" title="The core, and what builds on it" />
    <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
      <p>
        These 7 characteristics are the baseline every design decision on this page gets checked
        against. 4 are Chip Huyen&apos;s canonical characteristics of a well-designed system, from{' '}
        <em>Designing Machine Learning Systems</em> (O&apos;Reilly, 2022). The other 3 are CAP
        theorem&apos;s triad — during a network partition, a distributed system can only fully
        guarantee two of the three.
      </p>
      <p>
        This site&apos;s own{' '}
        <Link href="/projects#swe-compass" className={EXTERNAL_LINK_CLASS}>
          Projects page
        </Link>{' '}
        uses a close variant — reliability, maintainability, adaptability, and{' '}
        <strong className="text-zinc-800 dark:text-zinc-200">resilience</strong> in place of
        scalability — a deliberate adaptation for a system running on a $0 budget that can&apos;t
        vertically scale.
      </p>
    </div>

    <div className="card-base p-5 mt-6 space-y-6">
      <div>
        <span className="text-micro text-zinc-400 block mb-3">{SOURCE_GROUP_LABELS.huyen}</span>
        <div className="grid gap-3 sm:grid-cols-2">
          {groupBySource('huyen').map((characteristic) => (
            <div
              key={characteristic.id}
              className="rounded-lg border border-zinc-100 dark:border-zinc-800 p-3"
            >
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                {characteristic.label}
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500 leading-relaxed">
                {characteristic.summary}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-6">
        <span className="text-micro text-zinc-400 block mb-3">{SOURCE_GROUP_LABELS.cap}</span>
        <div className="grid gap-3 sm:grid-cols-3">
          {groupBySource('cap').map((characteristic) => (
            <div
              key={characteristic.id}
              className="rounded-lg border border-zinc-100 dark:border-zinc-800 p-3"
            >
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                {characteristic.label}
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500 leading-relaxed">
                {characteristic.summary}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>

    <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
      Once these hold, everything else is situational — which characteristic matters most, and how
      much, depends on this system&apos;s specific constraints:
    </p>

    <div className="flex flex-wrap gap-2 mt-4">
      {SITUATIONAL_CHARACTERISTICS.map((characteristic) => (
        <a
          key={characteristic.id}
          href={`#${characteristic.questionId}`}
          title={characteristic.summary}
          className={cn(
            'tag-blue max-w-full truncate hover:underline',
            FOCUS_RING,
          )}
        >
          {characteristic.label} →
        </a>
      ))}
    </div>
  </section>
);

export default CoreCharacteristicsSection;
