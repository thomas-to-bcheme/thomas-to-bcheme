import { ChevronDown } from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';
import { COMMUNICATION_SCRIPTS } from '@/constants/systemDesignPrep/communicationScripts';

/**
 * <details> accordion per script — same idiom as FaqAccordionItem —
 * `whitespace-pre-line` on the template body so bracketed multi-sentence
 * templates render with their authored line breaks.
 */
const CommunicationScriptsSection = () => (
  <section id="communication-scripts" className="scroll-mt-24 mt-20">
    <SectionHeading eyebrow="Say This, Not Nothing" title="6 reusable communication scripts" />
    <div className="space-y-3">
      {COMMUNICATION_SCRIPTS.map((script) => (
        <details key={script.id} className="group card-base p-0 overflow-hidden">
          <summary className="flex items-center justify-between gap-4 p-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <span className="text-sm font-semibold text-zinc-900 dark:text-white">{script.label}</span>
            <ChevronDown className="w-4 h-4 shrink-0 text-zinc-400 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="px-4 pb-4 space-y-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-500 leading-relaxed">
              <span className="font-semibold text-zinc-600 dark:text-zinc-400">When to use:</span>{' '}
              {script.whenToUse}
            </p>
            <p className="whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3 border border-zinc-100 dark:border-zinc-800">
              {script.template}
            </p>
          </div>
        </details>
      ))}
    </div>
  </section>
);

export default CommunicationScriptsSection;
