import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import SectionHeading from '@/components/ui/SectionHeading';
import PageSectionNav from '@/components/ui/PageSectionNav';
import AiMlPageShell from '@/components/sections/aiMl/AiMlPageShell';
import KeyTerms from '@/components/sections/deployOps/KeyTerms';
import ReadingPathStages from '@/components/sections/deployOps/ReadingPathStages';
import StrategyTabs from '@/components/sections/deployOps/StrategyTabs';
import TopicCard from '@/components/sections/deployOps/TopicCard';
import { BODY_TEXT_CLASS, FOCUS_RING, LINK_CLASS, SECTION_CLASS } from '@/components/sections/sweDe/styles';
import {
  DEPLOYOPS_BASE_PATH,
  DEPLOYOPS_LEVELS,
  DEPLOY_STRATEGIES,
  TOPICS_BY_LEVEL,
  getLevelById,
  getStagesForLevel,
  getTermsForLevel,
} from '@/constants/deployOps';

/** Unknown level slugs 404 at the routing layer; notFound() below narrows the type. */
export const dynamicParams = false;

export function generateStaticParams(): { level: string }[] {
  return DEPLOYOPS_LEVELS.map((level) => ({ level: level.id }));
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
    title: `${entry.navLabel} — DeployOps — Thomas To`,
    description: entry.summary,
    alternates: { canonical: entry.href },
  };
}

const STRATEGIES_SECTION_ID = 'strategies';
const READING_SECTION_ID = 'reading';
const TERMS_SECTION_ID = 'terms';

export default async function DeployOpsLevelPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  const entry = getLevelById(level);
  if (!entry) notFound();

  const topics = TOPICS_BY_LEVEL[entry.id];
  const stages = getStagesForLevel(entry.id);
  const hasStrategies = entry.id === 'devops';
  const levelPosition = DEPLOYOPS_LEVELS.findIndex((candidate) => candidate.id === entry.id);
  const previousLevel = DEPLOYOPS_LEVELS[levelPosition - 1] ?? null;
  const nextLevel = DEPLOYOPS_LEVELS[levelPosition + 1] ?? null;

  const sectionItems = [
    ...topics.map((topic) => ({ id: topic.id, label: topic.navLabel })),
    ...(hasStrategies ? [{ id: STRATEGIES_SECTION_ID, label: 'Strategy manifests' }] : []),
    { id: READING_SECTION_ID, label: 'What to read' },
    { id: TERMS_SECTION_ID, label: 'Key terms' },
  ];

  return (
    <AiMlPageShell
      eyebrow={entry.eyebrow}
      title={entry.title}
      titleAccent={entry.titleAccent}
      lede={entry.lede}
      backHref={DEPLOYOPS_BASE_PATH}
      backLabel="Back to DeployOps overview"
    >
      <PageSectionNav items={sectionItems} />

      <p className={`mb-6 max-w-3xl ${BODY_TEXT_CLASS}`}>
        Each topic is argued from first principles: what it is, why it exists, and how it works. The
        lifecycle chips link back to the{' '}
        <Link href={`${DEPLOYOPS_BASE_PATH}#stages`} className={LINK_CLASS}>
          overview stage
        </Link>{' '}
        the topic specializes.
      </p>

      <div className="space-y-6">
        {topics.map((topic) => (
          <TopicCard key={topic.id} topic={topic} />
        ))}
      </div>

      {hasStrategies && (
        <section id={STRATEGIES_SECTION_ID} className={SECTION_CLASS}>
          <SectionHeading eyebrow="In practice" title="Release strategies as manifests" />
          <StrategyTabs strategies={DEPLOY_STRATEGIES} />
        </section>
      )}

      <section id={READING_SECTION_ID} className={SECTION_CLASS}>
        <SectionHeading eyebrow="Reading path" title={`What to read for ${entry.navLabel}`} />
        <ReadingPathStages stages={stages} />
      </section>

      <section id={TERMS_SECTION_ID} className={SECTION_CLASS}>
        <SectionHeading eyebrow="Vocabulary" title="Key terms" />
        <KeyTerms id={`terms-${entry.id}`} terms={getTermsForLevel(entry.id)} />
      </section>

      <nav aria-label="Specialization navigation" className="mt-12 flex flex-wrap justify-between gap-4">
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
