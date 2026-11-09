import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import PageSectionNav from '@/components/ui/PageSectionNav';
import AiMlPageShell from '@/components/sections/aiMl/AiMlPageShell';
import AdrChoiceGrid from '@/components/sections/implementation/AdrChoiceGrid';
import CheckpointCard, { CHECKPOINT_SECTION_ID } from '@/components/sections/implementation/CheckpointCard';
import ConceptExplorer from '@/components/sections/implementation/ConceptExplorer';
import EcosystemMatrix from '@/components/sections/implementation/EcosystemMatrix';
import LessonSection from '@/components/sections/implementation/LessonSection';
import TraitsExplorer from '@/components/sections/implementation/TraitsExplorer';
import { FOCUS_RING, LINK_CLASS } from '@/components/sections/sweDe/styles';
import {
  IMPLEMENTATION_BASE_PATH,
  IMPLEMENTATION_LANGUAGES,
  IMPLEMENTATION_MODULES,
  MODULE_CONTENT,
  getModuleById,
  type ModuleId,
} from '@/constants/implementation';
import {
  CONCEPT_PARTS,
  EXPLORER_SECTION_ID,
  LANGUAGE_TRAITS,
  MODULE_CONCEPTS,
  type Concept,
} from '@/constants/implementation/concepts';

/** Unknown module slugs 404 at the routing layer; notFound() below narrows the type. */
export const dynamicParams = false;

export function generateStaticParams(): { module: string }[] {
  return IMPLEMENTATION_MODULES.map((entry) => ({ module: entry.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ module: string }>;
}): Promise<Metadata> {
  const { module: moduleId } = await params;
  const entry = getModuleById(moduleId);
  // generateMetadata must not throw — the page body handles the 404.
  if (!entry) return {};

  return {
    title: `${entry.navLabel} — Implementation — Thomas To`,
    description: entry.summary,
    alternates: { canonical: entry.href },
  };
}

const EXPLORER_LANGUAGES = IMPLEMENTATION_LANGUAGES.map((language) => ({
  id: language.id,
  name: language.name,
}));

/** Parts in display order (CONCEPT_PARTS is keyed by id, in curriculum order), limited to those a module uses. */
function partsFor(concepts: Concept[]) {
  return Object.values(CONCEPT_PARTS).filter((part) =>
    concepts.some((concept) => concept.part === part.id),
  );
}

/** Section-specific extras that are not concept explorers, per module, keyed by section id. */
const SECTION_EXTRAS: Partial<Record<ModuleId, Record<string, ReactNode>>> = {
  foundations: {
    traits: <TraitsExplorer traits={LANGUAGE_TRAITS} languages={EXPLORER_LANGUAGES} />,
  },
  architecture: {
    choices: <AdrChoiceGrid />,
    ecosystem: <EcosystemMatrix />,
  },
};

/** The content for one section: the concept explorer if this module has one, else any registered extra. */
function sectionExtra(moduleId: ModuleId, sectionId: string, label: string): ReactNode {
  const concepts = MODULE_CONCEPTS[moduleId];
  if (concepts && sectionId === EXPLORER_SECTION_ID) {
    return (
      <ConceptExplorer
        concepts={concepts}
        parts={partsFor(concepts)}
        languages={EXPLORER_LANGUAGES}
        label={label}
      />
    );
  }
  return SECTION_EXTRAS[moduleId]?.[sectionId];
}

export default async function ImplementationModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module: moduleId } = await params;
  const entry = getModuleById(moduleId);
  if (!entry) notFound();

  const content = MODULE_CONTENT[entry.id];
  const position = IMPLEMENTATION_MODULES.findIndex((candidate) => candidate.id === entry.id);
  const previousModule = IMPLEMENTATION_MODULES[position - 1] ?? null;
  const nextModule = IMPLEMENTATION_MODULES[position + 1] ?? null;

  const sectionItems = [
    ...content.sections.map((section) => ({ id: section.id, label: section.navLabel })),
    { id: CHECKPOINT_SECTION_ID, label: 'Checkpoint' },
  ];

  return (
    <AiMlPageShell
      eyebrow={entry.eyebrow}
      title={entry.title}
      titleAccent={entry.titleAccent}
      lede={entry.lede}
      backHref={IMPLEMENTATION_BASE_PATH}
      backLabel="Back to Implementation overview"
    >
      <PageSectionNav items={sectionItems} />

      {content.sections.map((section) => (
        <LessonSection key={section.id} section={section} eyebrow={entry.eyebrow}>
          {sectionExtra(entry.id, section.id, entry.navLabel)}
        </LessonSection>
      ))}

      <CheckpointCard points={content.checkpoint} />

      <nav aria-label="Module navigation" className="mt-12 flex flex-wrap justify-between gap-4">
        {previousModule ? (
          <Link
            href={previousModule.href}
            className={`inline-flex items-center gap-1.5 text-sm ${LINK_CLASS} rounded-sm ${FOCUS_RING}`}
          >
            <ArrowLeft size={14} /> {previousModule.eyebrow}
          </Link>
        ) : (
          <span />
        )}
        {nextModule && (
          <Link
            href={nextModule.href}
            className={`inline-flex items-center gap-1.5 text-sm ${LINK_CLASS} rounded-sm ${FOCUS_RING}`}
          >
            {nextModule.eyebrow} <ArrowRight size={14} />
          </Link>
        )}
      </nav>
    </AiMlPageShell>
  );
}
