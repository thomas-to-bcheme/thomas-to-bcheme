import SectionHeading from '@/components/ui/SectionHeading';
import SourceQuote from '@/components/ui/SourceQuote';
import { HIGHLIGHTS } from '@/constants/behavioural/highlights';
import { SOURCES } from '@/constants/behavioural/sources';

/**
 * Resolves a Highlight's `sourceId` against `SOURCES` — the page's single
 * authoritative list of chapter URLs — instead of duplicating a chapter URL
 * as a local literal (the pattern every other behavioural section uses).
 * Throws on an unknown id rather than silently linking nowhere, since this is
 * static, build-time data: a mismatch here is a bug to fix, not a case to
 * degrade gracefully around.
 */
const resolveSourceUrl = (sourceId: string): string => {
  const source = SOURCES.find((entry) => entry.id === sourceId);
  if (!source) {
    throw new Error(
      `ExecutiveSummarySection: unknown source id "${sourceId}" — check src/constants/behavioural/sources.ts`
    );
  }
  return source.url;
};

/**
 * The executive-summary/TL;DR block for readers who want the highest-signal
 * takeaways without reading the full page — the first thing inside `<main>`,
 * mirroring where `ExecutiveSummary` sits on `/projects`. Built from
 * `SourceQuote` cards rather than the anchor-jump cards that component uses,
 * since most of these are verbatim quotes pulled from the ByteByteGo source
 * chapters, not links back into this page's own sections. The one entry with
 * no `sourceId` (this guide's own synthesis) renders with no link at all —
 * `SourceQuote` falls back to a plain, non-linked attribution.
 */
const ExecutiveSummarySection = () => (
  <section id="highlights" className="scroll-mt-24 mb-16">
    <SectionHeading eyebrow="Read This First" title="If you only take six things from this page" />
    <p className="mb-6 max-w-3xl text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
      Six takeaways worth remembering above everything else below — the recurring signal across
      experienced engineers, ByteByteGo&apos;s own course, and every competency chapter on this page,
      distilled down for anyone who wants the point before the notes.
    </p>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {HIGHLIGHTS.map((highlight) => (
        <SourceQuote
          key={highlight.id}
          label={highlight.label}
          quote={highlight.quote}
          attribution={highlight.attribution}
          href={highlight.sourceId ? resolveSourceUrl(highlight.sourceId) : undefined}
          color={highlight.color}
          icon={highlight.icon}
        />
      ))}
    </div>
  </section>
);

export default ExecutiveSummarySection;
