import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import SectionHeading from '@/components/ui/SectionHeading';
import AiMlPageShell from '@/components/sections/aiMl/AiMlPageShell';
import ModelGrid from '@/components/sections/aiMl/ModelGrid';
import { AI_ML_CATEGORIES, getCategoryById, getModelsByGroup } from '@/constants/aiMl';

/**
 * Any category slug not enumerated below 404s at the routing layer. The
 * notFound() call in the body is not redundant: it is what narrows
 * AiMlCategory | null to AiMlCategory for everything downstream.
 */
export const dynamicParams = false;

export function generateStaticParams(): { category: string }[] {
  return AI_ML_CATEGORIES.map((category) => ({ category: category.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const entry = getCategoryById(category);
  // generateMetadata must not throw — the page body handles the 404.
  if (!entry) return {};

  return {
    title: `${entry.label} — AI/ML — Thomas To`,
    description: entry.description,
    alternates: { canonical: `/ai-ml/${entry.id}` },
  };
}

export default async function AiMlCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const entry = getCategoryById(category);
  if (!entry) notFound();

  return (
    <AiMlPageShell
      eyebrow={entry.eyebrow}
      title={entry.label}
      lede={entry.description}
      backHref="/ai-ml"
      backLabel="Back to AI/ML"
    >
      <div className="card-base p-4 sm:p-5 border-l-2 border-l-blue-400 dark:border-l-blue-500 max-w-3xl">
        <span className="text-micro text-zinc-400 block mb-1.5">The premise</span>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {entry.premise}
        </p>
      </div>

      {entry.groups.map((group, index) => (
        <section key={group.id} id={group.id} className="scroll-mt-24 mt-12">
          <SectionHeading
            eyebrow={
              index === 0
                ? 'Most general'
                : index === entry.groups.length - 1
                  ? 'Most specialized'
                  : `Rung ${index + 1}`
            }
            title={group.label}
          />
          <p className="mb-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {group.summary}
          </p>
          <p className="mb-4 max-w-3xl text-sm text-zinc-500 dark:text-zinc-500 leading-relaxed italic">
            {group.abstraction}
          </p>

          <ModelGrid
            models={getModelsByGroup(entry.id, group.id)}
            emptyMessage={`${group.label} models are still being written.`}
          />
        </section>
      ))}
    </AiMlPageShell>
  );
}
