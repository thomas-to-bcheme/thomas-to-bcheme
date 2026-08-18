import Link from 'next/link';
import SectionHeading from '@/components/ui/SectionHeading';
import Badge from '@/components/ui/Badge';
import {
  STAFF_SIGNALS,
  COMMON_MISTAKES,
  LEVEL_ARCHITECTURE_DIMENSIONS,
  PROMOTION_ALIGNMENT_CHECKLIST,
} from '@/constants/systemDesignPrep/staffSignals';

const LIST_ITEM_CLASS =
  'text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-4 relative before:content-[\'—\'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1';

/**
 * Numbered grid of the 9 staff-level signals, each with a concrete example
 * and a takeaway; a Senior vs. Staff+ architecture-judgment comparison; and
 * a common-mistakes / promotion-checklist pair underneath. The interpersonal
 * side of the senior→staff shift (storytelling, scope, the "local hero"
 * trap) is intentionally not repeated here — it already lives on the
 * Behavioural prep page, linked below.
 */
const StaffSignalsSection = () => (
  <section id="staff-signals" className="scroll-mt-24 mt-20">
    <SectionHeading eyebrow="What Staff Looks Like" title="9 signals that separate staff-level answers" />
    <div className="grid gap-4 sm:grid-cols-2">
      {STAFF_SIGNALS.map((signal) => (
        <div key={signal.id} className="card-base p-4">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-bold flex items-center justify-center shrink-0">
              {signal.signalNumber}
            </span>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{signal.label}</h3>
          </div>
          <p className="text-sm italic text-zinc-500 dark:text-zinc-500 leading-relaxed">
            &ldquo;{signal.example}&rdquo;
          </p>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{signal.takeaway}</p>
        </div>
      ))}
    </div>

    <div className="mt-8 card-base p-4">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">
        Senior (L5) vs. Staff+ (L6+) — architecture judgment
      </h3>
      <div className="space-y-3">
        {LEVEL_ARCHITECTURE_DIMENSIONS.map((dim) => (
          <div key={dim.id}>
            <span className="text-micro text-zinc-400 mb-1.5 block">{dim.dimension}</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 border-l-2 border-l-blue-400 dark:border-l-blue-500 p-3">
                <Badge color="blue" variant="outline">
                  Senior
                </Badge>
                <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{dim.senior}</p>
              </div>
              <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 border-l-2 border-l-purple-400 dark:border-l-purple-500 p-3">
                <Badge color="purple" variant="outline">
                  Staff+
                </Badge>
                <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{dim.staff}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        This is the technical-architecture slice of that shift only. The interpersonal and
        storytelling side — time horizon, autonomy, conflict, and the &ldquo;local hero&rdquo;
        trap — lives on{' '}
        <Link
          href="/behavioural#senior-vs-staff"
          className={`font-semibold text-blue-700 dark:text-blue-400 hover:underline rounded-sm ${FOCUS_RING}`}
        >
          the Behavioural prep page
        </Link>
        , not repeated here.
      </p>
    </div>

    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      <div className="card-base p-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">Common mistakes</h3>
        <ul className="space-y-1.5">
          {COMMON_MISTAKES.map((line) => (
            <li key={line} className={LIST_ITEM_CLASS}>
              {line}
            </li>
          ))}
        </ul>
      </div>

      <div className="card-base p-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">Promotion checklist</h3>
        <ul className="space-y-1.5">
          {PROMOTION_ALIGNMENT_CHECKLIST.map((line) => (
            <li key={line} className={LIST_ITEM_CLASS}>
              {line}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);

export default StaffSignalsSection;
