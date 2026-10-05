import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import SectionHeading from '@/components/ui/SectionHeading';
import PageSectionNav from '@/components/ui/PageSectionNav';
import AiMlPageShell from '@/components/sections/aiMl/AiMlPageShell';
import FirstPrinciplesTopicCard from '@/components/sections/sweDe/FirstPrinciplesTopicCard';
import ReadingPathStages from '@/components/sections/sweDe/ReadingPathStages';
import { BODY_TEXT_CLASS, FOCUS_RING, LINK_CLASS, SECTION_CLASS } from '@/components/sections/sweDe/styles';
import {
  READING_STAGES,
  SWE_DE_BASE_PATH,
  SWE_DE_LEVELS,
  TOPICS_BY_LEVEL,
  getLevelById,
} from '@/constants/sweDe';

/** Unknown level slugs 404 at the routing layer; notFound() below narrows the type. */
export const dynamicParams = false;

export function generateStaticParams(): { level: string }[] {
  return SWE_DE_LEVELS.map((level) => ({ level: level.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ level: string }>;
}): Promise<Metadata> {
  const { level } = await params;
  const entry = getLevelById(level);
  // generateMetadata must not throw — the page body handles the 404.
  if (!entry) return {};

  return {
    title: `${entry.navLabel} — SWE/DE — Thomas To`,
    description: entry.summary,
    alternates: { canonical: entry.href },
  };
}

const READING_SECTION_ID = 'reading';

export default async function SweDeLevelPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  const entry = getLevelById(level);
  if (!entry) notFound();

  const topics = TOPICS_BY_LEVEL[entry.id];
  const stages = READING_STAGES.filter((stage) => stage.kind === entry.id);
  const levelPosition = SWE_DE_LEVELS.findIndex((candidate) => candidate.id === entry.id);
  const previousLevel = SWE_DE_LEVELS[levelPosition - 1] ?? null;
  const nextLevel = SWE_DE_LEVELS[levelPosition + 1] ?? null;

  const sectionItems = [
    ...topics.map((topic) => ({ id: topic.id, label: topic.navLabel })),
    { id: READING_SECTION_ID, label: 'What to read' },
  ];

  return (
    <AiMlPageShell
      eyebrow={entry.eyebrow}
      title={entry.title}
      titleAccent={entry.titleAccent}
      lede={entry.lede}
      backHref={SWE_DE_BASE_PATH}
      backLabel="Back to SWE/DE overview"
    >
      <PageSectionNav items={sectionItems} />

      <p className={`mb-6 max-w-3xl ${BODY_TEXT_CLASS}`}>
        Each topic follows the{' '}
        <Link href={`${SWE_DE_BASE_PATH}#north-star`} className={LINK_CLASS}>
          North Star
        </Link>{' '}
        order: what the decision is, why first principles favor one answer, and how to apply it.
      </p>

      <div className="space-y-6">
        {topics.map((topic) => (
          <FirstPrinciplesTopicCard key={topic.id} topic={topic} />
        ))}
      </div>

      <section id={READING_SECTION_ID} className={SECTION_CLASS}>
        <SectionHeading eyebrow="Reading path" title={`What to read for the ${entry.navLabel.toLowerCase()} level`} />
        <ReadingPathStages stages={stages} />
      </section>

      <nav aria-label="Level navigation" className="mt-12 flex flex-wrap justify-between gap-4">
        {previousLevel ? (
          <Link
            href={previousLevel.href}
            className={`inline-flex items-center gap-1.5 text-sm ${LINK_CLASS} rounded-sm ${FOCUS_RING}`}
          >
            <ArrowLeft size={14} /> {previousLevel.eyebrow}
          </Link>
        ) : (
          <span />
        )}
        {nextLevel && (
          <Link
            href={nextLevel.href}
            className={`inline-flex items-center gap-1.5 text-sm ${LINK_CLASS} rounded-sm ${FOCUS_RING}`}
          >
            {nextLevel.eyebrow} <ArrowRight size={14} />
          </Link>
        )}
      </nav>
    </AiMlPageShell>
  );
}
