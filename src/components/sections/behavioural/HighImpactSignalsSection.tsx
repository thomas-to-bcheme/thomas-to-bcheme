import SectionHeading from '@/components/ui/SectionHeading';
import SourceQuote from '@/components/ui/SourceQuote';
import { HIGH_IMPACT_SIGNALS } from '@/constants/behavioural/highImpactSignals';
import { SOURCES } from '@/constants/behavioural/sources';

/**
 * Resolves a signal's `sourceId` against `SOURCES` — the page's single
 * authoritative list of chapter URLs — instead of duplicating a chapter URL
 * as a local literal. Throws on an unknown id rather than silently linking
 * nowhere, since this is static, build-time data: a mismatch here is a bug
 * to fix, not a case to degrade gracefully around. Same pattern as
 * `ExecutiveSummarySection.tsx`'s `resolveSourceUrl`.
 */
const resolveSourceUrl = (sourceId: string): string => {
  const source = SOURCES.find((entry) => entry.id === sourceId);
  if (!source) {
    throw new Error(
      `HighImpactSignalsSection: unknown source id "${sourceId}" — check src/constants/behavioural/sources.ts`
    );
  }
  return source.url;
};

const leadSignal = HIGH_IMPACT_SIGNALS.find((signal) => signal.wide);
const supportingSignals = HIGH_IMPACT_SIGNALS.filter((signal) => !signal.wide);

if (!leadSignal) {
  throw new Error('HighImpactSignalsSection: HIGH_IMPACT_SIGNALS must include exactly one entry with wide: true');
}

/**
 * The direct-quote evidence behind the career ladder in `SeniorVsStaffSection`
 * (rendered immediately before this one) — not another paraphrase of it, but
 * what the source material itself says, competency by competency, about what
 * turns technical competence into being a high-impact, value-add asset to an
 * organization rather than just a competent contributor. The lead quote names
 * the two competencies ByteByteGo's own course calls non-negotiable at senior
 * and above; the supporting grid shows the same underlying pattern recurring
 * across problem-solving, learning, innovation, and customer focus too.
 */
const HighImpactSignalsSection = () => (
  <section id="high-impact-signals" className="scroll-mt-24 mb-16">
    <SectionHeading eyebrow="Straight From The Source" title="What separates competent from indispensable" />
    <p className="mb-6 max-w-3xl text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
      The ladder above tells you which level your stories land at. This is the evidence, in
      ByteByteGo&apos;s own words rather than a paraphrase of it, for what actually earns that
      level — not just calibrated scope, but the recurring pattern underneath problem-solving,
      learning, innovation, customer focus, developing others, and strategic leadership that
      separates a competent contributor from a high-impact asset an organization keeps investing in.
    </p>
    <SourceQuote
      label={leadSignal.label}
      quote={leadSignal.quote}
      attribution={leadSignal.attribution}
      href={resolveSourceUrl(leadSignal.sourceId)}
      color={leadSignal.color}
      icon={leadSignal.icon}
    />
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      {supportingSignals.map((signal) => (
        <SourceQuote
          key={signal.id}
          label={signal.label}
          quote={signal.quote}
          attribution={signal.attribution}
          href={resolveSourceUrl(signal.sourceId)}
          color={signal.color}
          icon={signal.icon}
        />
      ))}
    </div>
  </section>
);

export default HighImpactSignalsSection;
