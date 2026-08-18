import SectionHeading from '@/components/ui/SectionHeading';
import { STRATEGY_DOMAINS, STRATEGY_LEVERS } from '@/constants/systemDesignPrep/crossDomainStrategies';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1';

/**
 * Cross-domain strategy comparison. The Reference Grid above is a vocabulary
 * index — one column per SWE Compass stage. This is the comparison that grid
 * deliberately doesn't attempt: how the same non-functional lever (scaling,
 * consistency, failure handling, cost, observability) is actually pulled
 * differently depending on which layer is under pressure. Security gets its
 * own explicit column ONLY here, by user decision — the Reference Grid keeps
 * folding it into Ops.
 */
const CrossDomainStrategiesSection = () => (
  <section id="cross-domain-strategies" className="scroll-mt-24 mt-20">
    <SectionHeading eyebrow="Reference" title="The same lever, at every layer" />
    <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-8">
      Design, Data, Model, Backend, Frontend, Ops, and Security aren&apos;t separate problems —
      they&apos;re the same handful of non-functional levers, pulled differently depending on which
      layer is actually under pressure.
    </p>

    <div className="space-y-6">
      {STRATEGY_LEVERS.map((lever) => {
        const LeverIcon = lever.icon;
        return (
          <div key={lever.id} id={lever.id} className="card-base p-5 sm:p-6 scroll-mt-24">
            <div className="flex items-center gap-2 mb-1">
              <LeverIcon size={16} className="stroke-[2.5] text-blue-600 dark:text-blue-400 shrink-0" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{lever.label}</h3>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-500 leading-relaxed mb-4">{lever.summary}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
              {lever.treatments.map((treatment) => {
                const domain = STRATEGY_DOMAINS.find((candidate) => candidate.id === treatment.domain);
                if (!domain) return null;
                const DomainIcon = domain.icon;
                return (
                  <div
                    key={treatment.domain}
                    className="rounded-lg border border-zinc-100 dark:border-zinc-800 p-3"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <DomainIcon size={13} className="stroke-[2.5] text-zinc-400 dark:text-zinc-600 shrink-0" />
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-600">
                        {domain.label}
                      </p>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {treatment.approach}
                    </p>
                    {treatment.crossLink && (
                      <a
                        href={treatment.crossLink.href}
                        className={`mt-1.5 inline-block tag-blue hover:underline ${FOCUS_RING}`}
                      >
                        {treatment.crossLink.label}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  </section>
);

export default CrossDomainStrategiesSection;
