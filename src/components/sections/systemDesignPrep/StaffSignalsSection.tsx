import SectionHeading from '@/components/ui/SectionHeading';
import { STAFF_SIGNALS, COMMON_MISTAKES } from '@/constants/systemDesignPrep/staffSignals';

const LIST_ITEM_CLASS =
  'text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-4 relative before:content-[\'—\'] before:absolute before:left-0 before:text-zinc-300 dark:before:text-zinc-700';

/**
 * Numbered grid of the 8 staff-level signals, each with a concrete example
 * and a takeaway, plus a common-mistakes list underneath.
 */
const StaffSignalsSection = () => (
  <section id="staff-signals" className="scroll-mt-24 mt-20">
    <SectionHeading eyebrow="What Staff Looks Like" title="8 signals that separate staff-level answers" />
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
      <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">Common mistakes</h3>
      <ul className="space-y-1.5">
        {COMMON_MISTAKES.map((line) => (
          <li key={line} className={LIST_ITEM_CLASS}>
            {line}
          </li>
        ))}
      </ul>
    </div>
  </section>
);

export default StaffSignalsSection;
